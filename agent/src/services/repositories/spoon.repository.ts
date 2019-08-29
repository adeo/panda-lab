import {AgentRepository, AgentStatus} from "./agent.repository";
import {BehaviorSubject, combineLatest, from, Observable, Subscription} from "rxjs";
import {CollectionName, FirebaseRepository} from "./firebase.repository";
import {AdbRepository} from "./adb.repository";
import {DevicesService} from "../devices.service";
import {filter, flatMap, map, tap, toArray} from "rxjs/operators";
import {Device, DeviceStatus, JobTask} from 'pandalab-commons';
import {JobsService} from "../jobs.service";
import {WorkspaceRepository} from "./workspace.repository";

export class SpoonRepository {
    private statusSub: Subscription;


    constructor(private agentRepo: AgentRepository,
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


    private listenJobs(): Observable<void> {

        const changeBehaviour = new BehaviorSubject("");
        let hasChange = false;
        let working = false;

        return combineLatest(
            this.devicesService.listenAgentDevices(this.agentRepo.UUID),
            this.firebaseRepo.listenCollection(CollectionName.JOBS_TASKS),
            changeBehaviour,
            (devices) => {
                if (working) {
                    hasChange = true;
                }
                return devices
            }
        )
            .pipe(
                filter(() => !working),
                tap(() => working = true),
                flatMap(v => from<Device[]>(v)),
                filter(d => d.status === DeviceStatus.available),
                flatMap((device: Device) => this.jobsService.getDeviceJob(device._ref.id)
                    .pipe(
                        filter(tasks => tasks.length > 0),
                        map(tasks => tasks[0]),
                        flatMap(task => {
                            device.status = DeviceStatus.working;
                            return this.devicesService.updateDevice(device).pipe(map(() => task))
                        })
                    )),
                toArray(),
                tap(() => {
                    working = false;
                    if (hasChange) {
                        changeBehaviour.next("")
                    }
                }),

                flatMap(from),
                flatMap(this.executeTask)
            )

    }

    executeTask(task: JobTask): Observable<any> {
        console.log(`start job ${task.job.id} on device ${task.device.id}`);
        const testDir = this.workspace.getJobDirectory(task.job.id);
        const deviceTestDir = this.workspace.getReportJobDirectory(task.job.id, task.device.id);
        return null // TODO
        // this.jobsService.getJob(task.job.id)
        //     .pipe(
        //         flatMap(job => {
        //             return zip(
        //                 this.firebaseRepo.getDocument<Artifact>(job.apk),
        //                 this.firebaseRepo.getDocument<Artifact>(job.apk_test)
        //             )
        //         })
        //
        //
        //     )


//         await asyncForEach(this.tasks, async (task: JobTask) => {
//             console.log("#######################");
//             console.log("#######################");
//             console.log("#######################");
//             console.log("#######################");
//             console.log("#######################");
//             const applicationReference = task.job.apk;
//             const applicationSnapshot = await applicationReference.get();
//             const data = applicationSnapshot.data();
//
//             const {versionName} = data;
//             const path = applicationReference.path;
//             const paths = path.split('/');
//             const fileStorage = `${paths[1]}_${paths[3]}_${versionName}`;
//             console.log(fileStorage);
//             const jobId = task._id;
//             const deviceId = task.device._id;
//
//             const {apk, apkTest} = task.job;
//             const logcatConfiguration = devicesUUID.find(value => value.id === deviceId);
//             if (!logcatConfiguration) {
//                 task.finish = true;
//                 task.ref.set({status: 'error'}, {merge: true});
//                 console.log(`Skip the device ${deviceId} is not connected`);
//                 return;
//             }
//             const serial = logcatConfiguration.serial;
//             console.log(`Start download apk for job : ${jobId}`);
//             const apkDocumentSnapshot = await apk.get();
//             const apkTestDocumentSnapshot = await apkTest.get();
//             const fileDebug = `/Users/mehdisli/.pandalab/demo-1.1.18-debug.apk`;//await this.downloadApk(jobId, apkDocumentSnapshot.data().path);
//             const fileTest = `/Users/mehdisli/.pandalab/demo-1.1.18-debug-test.apk`;//await this.downloadApk(jobId, apkTestDocumentSnapshot.data().path);
//             task.finish = true;
//             task.ref.set({status: 'running'}, {merge: true});
//             const reportDirectory = workspace.getReportJobDirectory(jobId, deviceId);
//
//
//             const spoonCommands = [
//                 `java -jar ${workspace.spoonJarPath}`,
//                 `--apk ${fileDebug}`,
//                 `--test-apk ${fileTest}`,
//                 `--sdk ${ANDROID_HOME}`,
//                 `--output ${reportDirectory}`,
//                 `-serial ${serial}`,
//             ];
//             const cmd = spoonCommands.join(' ');
//             console.log(`Run : ${cmd}`);
//
//             // const ex = require('child_process').spawn;
//             // const child = ex('java', ['-jar', `${workspace.spoonJarPath}`, '--apk', `${fileDebug}`, '--test-apk', `${fileTest}`, '--sdk', `${ANDROID_HOME}`, '--output', `${reportDirectory}`, '-serial', `${serial}`]);
//             // await new Promise(((resolve, reject) => {
//             //     child.stdout.on('data', function (data) {
//             //         console.log('stdout: ' + data.toString());
//             //     });
//             //
//             //     child.stderr.on('data', function (data) {
//             //         console.log('stderr: ' + data.toString());
//             //         reject();
//             //     });
//             //
//             //     child.on('exit', function (code) {
//             //         resolve();
//             //         console.log('child process exited with code ' + code.toString());
//             //     });
//             // }));
//             const {stdout, stderr} = await exec(cmd, {shell: true});
//             console.log('stdout:', stdout);
//             console.log('stderr:', stderr);
//             console.log(`End download apk for job : ${jobId}`);
//             const spoon: Spoon = parseSpoon(`${reportDirectory}/result.json`);
//             task.ref.set({status: 'finish', result: spoon}, {merge: true});
//         });
//         console.log(`End perform`);
//     }
//TODO
    }

}
