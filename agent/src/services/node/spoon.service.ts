import {AgentStatus, SetupService} from "./setup.service";
import {combineLatest, from, Observable, of, Subscription, zip} from "rxjs";
import {FirebaseRepository} from "../repositories/firebase.repository";
import {catchError, concatMap, filter, first, flatMap, map, switchMapTo, timeout} from "rxjs/operators";
import {Artifact, CollectionName, Device, DeviceStatus, Job, JobTask, TaskStatus} from 'pandalab-commons';
import {JobsService} from "../jobs.service";
import {FilesRepository} from "../repositories/files.repository";
import {AgentService} from "../agent.service";
import * as winston from "winston";
import {AgentsService} from "../agents.service";
import {DeviceAdb} from "../../models/adb";


export class SpoonService {
    private statusSub: Subscription;


    constructor(private logger: winston.Logger,
                private agentRepo: SetupService,
                private agentService: AgentService,
                private firebaseRepo: FirebaseRepository,
                private agentsService: AgentsService,
                private jobsService: JobsService,
                private workspace: FilesRepository) {

    }

    public setup() {
        this.agentRepo.agentStatus.subscribe(value => {
            switch (value) {
                case AgentStatus.CONFIGURING:
                case AgentStatus.NOT_LOGGED:
                    if (this.statusSub) {
                        this.statusSub.unsubscribe();
                        this.statusSub = null;
                    }
                    break;
                case AgentStatus.READY:
                    this.statusSub = this.listenJobs().subscribe();
                    break
            }
        })
    }

    private listenJobs(): Observable<any> {
        return combineLatest(this.tasksAsync, this.devices, (tasks, devices) => {
            console.log("COMBINE LATEST");
            return tasks
                .filter(task => task.device !== null)
                .filter(task => devices.find(device => device._ref === task.device) !== null);
        }).pipe(
            flatMap(tasks => {
                console.log('TASKS', tasks.length);
                return from<JobTask[]>(tasks).pipe(
                    concatMap(task => {
                        console.log("GET FIREBASE DEVICE");
                        return this.firebaseRepo.getDocument<Device>(task.device).pipe(
                            filter(device => device.status === DeviceStatus.available),
                            flatMap(device => this.saveDeviceStatus(device, DeviceStatus.working)),
                            map(device => {
                                return <TaskData>{
                                    task,
                                    device,
                                };
                            }),
                        );
                    })
                );
            }), // iterate,
            flatMap(perform => this.runTest(perform)),
            flatMap(device => this.saveDeviceStatus(device, DeviceStatus.offline)),
            // catchError(() => EMPTY)
        );
    }


    private runTest(perform: TaskData): Observable<Device> {
        console.log('RUN PERFORM');
        const device = perform.device;
        const task = perform.task;
        console.log(`RUN TASK ${task._ref.id} TO DEVICE ${device._ref.id}`);
        return this.agentService.getDeviceAdb(device._ref.id).pipe(
            flatMap(deviceAdb => {
                if (deviceAdb === null) {
                    // device is offline
                    throw new Error(`Device ${device._ref.id} not found in ADB`);
                } else {
                    return zip(this.saveDeviceStatus(device, DeviceStatus.working), this.saveJobTaskStatus(task, TaskStatus.running))
                        .pipe(
                            flatMap(() => this.prepareArtifacts(task, device, deviceAdb)),
                            flatMap(taskData => this.runSpoon(taskData)),
                            flatMap(() => {
                                console.log('LISTEN TASK REPORTS');
                                return this.firebaseRepo.listenDocument(CollectionName.TASK_REPORTS, task._ref.id)
                                    .pipe(
                                        first(value => value !== null),
                                        timeout(1000 * 30),
                                        catchError(err => {
                                            this.logger.error(`Listen task reports ${task._ref.id}`,err);
                                            throw new Error('Timeout - Listen task reports ' + task._ref.id);
                                        }),
                                    );
                            }),
                        );
                }
            }),
            flatMap(() => this.saveJobTaskStatus(task, TaskStatus.success)),
            catchError(reason => {
                return this.saveJobTaskStatus(task, TaskStatus.error, reason);
            }),
            map(() => device),
        );
    }

    private prepareArtifacts(task: JobTask, device: Device, deviceAdb: DeviceAdb) {
        return this.getJob(task).pipe(
            flatMap(job => zip(this.getArtifact(job.apk), this.getArtifact(job.apk_test), (artifact, testArtifact) => {
                return <TaskData>{
                    job,
                    artifact,
                    testArtifact
                };
            })),
            flatMap(perform => this.downloadArtifacts(perform)),
            map(perform => {
                return <TaskData>{
                    ...perform,
                    task,
                    device,
                    serial : deviceAdb.id,
                }
            }),
        );
    }

    private getJob(task: JobTask): Observable<Job> {
        return this.jobsService.getJob(task.job.id);
    }

    private getArtifact(documentReference: any): Observable<Artifact> {
        return this.firebaseRepo.getDocument<Artifact>(documentReference);
    }

    private get tasksAsync(): Observable<JobTask[]> {
        const query = this.firebaseRepo
            .getCollection(CollectionName.TASKS)
            .where('status', '==', TaskStatus.pending);

        return this.firebaseRepo.listenQuery<JobTask>(query);
    }

    private get devices(): Observable<Device[]> {
        return this.agentsService.listenAgentDevices(this.agentService.getAgentUUID());
    }

    private saveJobTaskStatus(jobTask: JobTask, status: TaskStatus, errorMessage: string = null): Observable<JobTask> {
        this.logger.info(`saveJobTaskStatus ${jobTask._ref.id} - ${status}`);
        jobTask.status = status;
        jobTask.error = errorMessage;
        return from(jobTask._ref.set({
            status: jobTask.status,
            error: jobTask.error
        }, {merge: true})).pipe(switchMapTo(of(jobTask)));
    }

    private saveDeviceStatus(device: Device, deviceStatus: DeviceStatus): Observable<Device> {
        this.logger.info('save device state');
        device.status = deviceStatus;
        return of(device);
    }

    private runSpoon(perform: TaskData): Observable<void> {
        console.log('RUN COMMAND');
        return from(this.runCommandPromise(perform));
    }

    private async runCommandPromise(perform: TaskData): Promise<void> {
        this.logger.verbose(`run command serial = ${perform.serial}`);
        const reportDirectory = this.workspace.getReportJobDirectory(perform.job._ref.id, perform.device._ref.id);
        const spoonCommands = [
            `java -jar ${this.workspace.spoonJarPath}`,
            `--apk ${perform.artifactPath}`,
            `--test-apk ${perform.testArtifactPath}`,
            `--sdk ${process.env.ANDROID_HOME}`,
            `--output ${reportDirectory}`,
            `-serial ${perform.serial}`,
        ];

        const cmd = spoonCommands.join(' ');
        this.logger.info(`Run : ${cmd}`);

        const {error, stdout, stderr} = await require('util').promisify(require('child_process').exec)(cmd, {shell: true});
        this.logger.info('stdout:', stdout);

        if (stderr) {
            this.logger.warn('stderr:', stderr);
        }

        const fs = require('fs');
        const reportFile = `${reportDirectory}/result.json`;
        if (!fs.existsSync(reportFile)) {
            throw new Error(stderr);
        }

        this.logger.info(`End download apk for job : ${perform.job._ref.id}`);

        const buffer = fs.readFileSync(`${reportDirectory}/result.json`);
        await this.firebaseRepo.firebase.storage().ref(`/reports/${perform.task._ref.id}/spoon.json`).put(buffer);

        this.uploadFiles(perform.task._ref.id, reportDirectory).then(() => {
            this.logger.info('upload file success');
        }).catch(err => {
            this.logger.error('error when upload images', err);
        });
    }

    async uploadFiles(taskId: string, reportDirectory: string) {
        const fs = require('fs');
        const path = require('path');

        const read = (dir) =>
            fs.readdirSync(dir)
                .reduce((files, file) =>
                        fs.statSync(path.join(dir, file)).isDirectory() ?
                            files.concat(read(path.join(dir, file))) :
                            files.concat(path.join(dir, file)),
                    []);

        this.walk(`${reportDirectory}`).forEach(image => {
            const imageBuffer = fs.readFileSync(image);
            const firebaseFilename = image.split(/(\\|\/)/g).pop();
            console.log(image);
            console.log(firebaseFilename);
            this.firebaseRepo.firebase.storage().ref(`/reports/${taskId}/images/${firebaseFilename}`).put(imageBuffer)
                .then(() => {
                    console.log('upload file ' + image + ' ok ');
                })
                .catch(err => console.error('uploadFiles', err));
        });
    }

    private walk(dir, baseDir = null) {
        const fs = require('fs');
        let results = [];
        if (baseDir === null) {
            baseDir = dir;
        }
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            file = dir + '/' + file;
            let stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(this.walk(file, baseDir));
            } else {
                results.push(file);
            }
        });
        return results
            .filter(filename => filename.endsWith('.png') || filename.endsWith('.gif'));
    }

    private downloadArtifacts(info: any): Observable<TaskData> {
        const job: Job = info.job;
        const artifact: Artifact = info.artifact;
        const testArtifact: Artifact = info.testArtifact;
        const apkDirectory = this.workspace.getApkDirectory();

        function getFilenameArtifact(artifact: Artifact): string {
            return artifact.path.split('/').slice(-1)[0];
        }

        const artifactPath = `${apkDirectory}${this.workspace.path.sep}${getFilenameArtifact(artifact)}`;
        const testArtifactPath = `${apkDirectory}${this.workspace.path.sep}${getFilenameArtifact(testArtifact)}`;

        console.log(artifactPath);
        console.log(testArtifactPath);

        const result = of(<TaskData>{
            job,
            artifact,
            testArtifact,
            artifactPath,
            testArtifactPath
        });

        return this.downloadApk(artifactPath, artifact)
            .pipe(
                switchMapTo(this.downloadApk(testArtifactPath, testArtifact)),
                switchMapTo(result),
            );
    }

    private downloadApk(path: string, artifact: Artifact): Observable<string> {
        return this.firebaseRepo.getFileUrl(artifact.path).pipe(
            flatMap(url => {
                this.logger.info(`Download artifact: ${artifact._ref.id}, url = ${url}, path = ${path}`);
                return this.workspace.downloadFile(path, url);
            }),
        );
    }

}

interface TaskData {
    device: Device;
    task: JobTask;
    job: Job;
    artifact: Artifact;
    testArtifact: Artifact;
    artifactPath: string;
    testArtifactPath: string;
    serial: string;
}
