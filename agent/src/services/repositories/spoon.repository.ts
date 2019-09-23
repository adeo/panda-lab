import {AgentRepository, AgentStatus} from "./agent.repository";
import {BehaviorSubject, combineLatest, EMPTY, from, Observable, of, Subscription, zip} from "rxjs";
import {FirebaseRepository} from "./firebase.repository";
import {AdbRepository} from "./adb.repository";
import {DevicesService} from "../devices.service";
import {catchError, filter, first, flatMap, map, onErrorResumeNext, switchMapTo, tap, timeout} from "rxjs/operators";
import {Artifact, CollectionName, Device, DeviceStatus, Job, JobTask, TaskStatus} from 'pandalab-commons';
import {JobsService} from "../jobs.service";
import {WorkspaceRepository} from "./workspace.repository";
import {AgentService} from "../agent.service";
import * as winston from "winston";


export class SpoonRepository {
    private statusSub: Subscription;


    constructor(private logger: winston.Logger,
                private agentRepo: AgentRepository,
                private agentService: AgentService,
                private firebaseRepo: FirebaseRepository,
                private adbRepo: AdbRepository,
                private devicesService: DevicesService,
                private jobsService: JobsService,
                private workspace: WorkspaceRepository) {


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
        const notifier = new BehaviorSubject<any>(null);
        const tasksQuery = this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS).where('status', '==', TaskStatus.pending);
        const tasksAsync = this.firebaseRepo.listenQuery<JobTask>(tasksQuery)
            .pipe(
                map(tasks => {
                    return tasks.filter(task => {
                        return task.device !== undefined;
                    });
                }),
            );
        const availableDevicesAsync = this.devicesService.listenAgentDevices(this.agentRepo.UUID)
            .pipe(
                map(devices => {
                    return devices.filter(device => device.status === DeviceStatus.available);
                }),
            );


        let working = false;
        let notify = false;

        const resetWorking = () => {
            this.logger.verbose('reset working');
            working = false;
            if (notify) {
                notifier.next(null);
            }
        };

        return combineLatest(availableDevicesAsync, tasksAsync, notifier, (availableDevices, tasks) => {
            if (working) {
                notify = true;
            }

            return {
                availableDevices,
                tasks
            };
        }).pipe(
            filter(() => !working),
            flatMap(tupleDevicesTasks => {
                const availableDevices = tupleDevicesTasks.availableDevices;
                const tasks = tupleDevicesTasks.tasks;

                const findDevice = (deviceId: string) => {
                    return availableDevices.find(value => value._ref.id === deviceId);
                };

                if (tasks.length == 0 || availableDevices.length == 0) {
                    this.logger.info("Task or device missing");
                    return EMPTY;
                }

                return from(tasks).pipe(
                    first(task => !!findDevice(task.device.id)),
                    tap(() => working = true),
                    map(task => {
                        return {
                            task,
                            device: findDevice(task.device.id),
                        };
                    }),
                    flatMap(tuple => {
                        const saveDeviceOffline = this.saveDeviceStatus(tuple.device, DeviceStatus.offline)
                            .pipe(
                                switchMapTo(of({
                                    ...tuple,
                                    error: `Device is offline`,
                                }))
                            );

                        return this.agentService.getDeviceAdb(tuple.device._ref.id).pipe(
                            flatMap(deviceAdb => {
                                if (deviceAdb === null) {
                                    return saveDeviceOffline;
                                } else {
                                    return of(<Perform>{
                                        ...tuple,
                                        serial: deviceAdb.id,
                                    });
                                }
                            }),
                            catchError(() => {
                                return saveDeviceOffline;
                            }),
                        );
                    }),
                    flatMap((tuple: any) => {
                        if (tuple.error) {
                            return this.saveJobTaskStatus(tuple.task, TaskStatus.error, tuple.error);
                        }

                        let timeoutInSeconds = 60 * 60 * 1000;
                        if (tuple.task.timeout) {
                            const timeInSeconds = tuple.task.timeout.seconds - Math.round(Date.now() / 1000);
                            this.logger.verbose(`Timeout exist : ${timeInSeconds}s`);
                            if (timeInSeconds <= 0) {
                                return this.saveJobTaskStatus(tuple.task, TaskStatus.error, 'timeout');
                            } else {
                                timeoutInSeconds = timeInSeconds;
                            }
                        } else {
                            this.logger.verbose(`Default timeout : ${timeoutInSeconds}s`);
                        }
                        this.logger.info('run test', tuple);
                        return this.saveDeviceStatus(tuple.device, DeviceStatus.working)
                            .pipe(
                                switchMapTo(this.runTest(tuple.task, tuple.device, tuple.serial)),
                                switchMapTo(this.saveDeviceStatus(tuple.device, DeviceStatus.available)),
                                onErrorResumeNext(this.saveDeviceStatus(tuple.device, DeviceStatus.available)),
                                timeout(timeoutInSeconds),
                            );
                    }),
                );
            }),
            tap(
                () => {
                    resetWorking();
                },
                (error) => {
                    this.logger.error(error);
                    resetWorking();
                }
            ),
            catchError(() => EMPTY)
        );
    }

    runTest(task: JobTask, device: Device, serial: string): Observable<JobTask> {
        this.logger.info(`run test, [jobId = ${task._ref.id}, deviceId = ${task.device.id}]`);
        return this.getJob(task)
            .pipe(
                flatMap(job => this.getJobArtifacts(job)),
                flatMap(perform => this.downloadArtifacts(perform)),
                map(perform => {
                    return <Perform>{
                        ...perform,
                        task,
                        device,
                        serial,
                    };
                }),
                flatMap(perform => {
                    return this.saveJobTaskStatus(perform.task, TaskStatus.running)
                        .pipe(
                            flatMap(() => this.runCommand(perform)),
                            flatMap(() => {
                                return this.firebaseRepo.listenDocument(CollectionName.TASK_REPORTS, perform.task._ref.id)
                                    .pipe(
                                        first(),
                                        timeout(30 * 1000),
                                    );
                            }),
                            flatMap(() => this.saveJobTaskStatus(perform.task, TaskStatus.success)),
                            catchError(err => {
                                console.error(err);
                                return this.saveJobTaskStatus(perform.task, TaskStatus.error, err.message);
                            }),
                        );
                }),
            );

    }

    private getJob(task: JobTask): Observable<Job> {
        return this.jobsService.getJob(task.job.id);
    }

    private getArtifact(documentReference: any): Observable<Artifact> {
        return this.firebaseRepo.getDocument<Artifact>(documentReference);
    }

    private getJobArtifacts(job: Job): Observable<Perform> {
        return zip(this.getArtifact(job.apk), this.getArtifact(job.apk_test), (artifact, testArtifact) => {
            return <Perform>{
                job,
                artifact,
                testArtifact
            };
        });
    }

    private downloadArtifacts(info: any): Observable<Perform> {
        console.log('downloadArtifacts');
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

        const result = of(<Perform>{
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
                tap(result => console.log(`RESULT = ${result}`)),
            );
    }

    private downloadApk(path: string, artifact: Artifact): Observable<string> {
        return this.generateDownloadUrl(artifact).pipe(
            flatMap(url => {
                this.logger.info(`Download artifact: ${artifact._ref.id}, url = ${url}, path = ${path}`);
                return this.workspace.downloadFile(path, url);
            }),
        );
    }

    private generateDownloadUrl(artifact: Artifact): Observable<string> {
        const getFileData = this.firebaseRepo.firebase.functions().httpsCallable("getFileData");
        return from(getFileData({path: artifact.path})).pipe(
            map(result => result.data.downloadUrl),
        );
    }

    private runCommand(perform: Perform): Observable<void> {
        return from(this.runCommandPromise(perform));
    }

    private async runCommandPromise(perform: Perform): Promise<void> {
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

        if (error !== null) {
            throw new Error(stderr);
        }

        this.logger.info(`End download apk for job : ${perform.job._ref.id}`);

        const fs = require('fs');
        const buffer = fs.readFileSync(`${reportDirectory}/spoon.json`);
        await this.firebaseRepo.firebase.storage().ref(`/reports/${perform.job._ref.id}/spoon.json`).put(buffer);
        // const json = fs.readFileSync(`${reportDirectory}/result.json`);
        // fs.unlinkSync(`${reportDirectory}/result.json`);


        // const saveSpoonResult = this.firebaseRepo.firebase.functions().httpsCallable("saveSpoonResult");
        // const result = await saveSpoonResult({
        //     jobId: perform.job._ref.id,
        //     deviceId: perform.device._ref.id,
        //     result: JSON.parse(json)
        // });
        //
        // if (result.data.success) {
        //     throw new Error("Can't save document in storage");
        // }
    }

    private saveJobTaskStatus(jobTask: JobTask, status: TaskStatus, errorMessage: string = null): Observable<JobTask> {
        this.logger.info(`saveJobTaskStatus ${jobTask._ref.id} - ${status}`);
        jobTask.status = status;
        jobTask.error = errorMessage;
        return from(jobTask._ref.set({
            status: jobTask.status,
            error: jobTask.error
        }, {merge: true})).pipe(switchMapTo(of(jobTask)));
        // return this.firebaseRepo.saveDocument<JobTask>(jobTask);
    }

    private saveDeviceStatus(device: Device, deviceStatus: DeviceStatus): Observable<Device> {
        device.status = deviceStatus;
        return this.firebaseRepo.saveDocument(device);
        // firebase error, DocumentReference.set() called with invalid data
        // return this.firebaseRepo.saveDocument<Device>(device);
    }

}

// export function flatMapIterate<T>(): OperatorFunction<T[], T> {
//     return flatMap(values => from<T[]>(values));
// }


interface Perform {
    device: Device;
    task: JobTask;
    job: Job;
    artifact: Artifact;
    testArtifact: Artifact;
    artifactPath: string;
    testArtifactPath: string;
    serial: string;
}
