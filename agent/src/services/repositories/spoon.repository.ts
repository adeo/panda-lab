import {AgentRepository, AgentStatus} from "./agent.repository";
import {BehaviorSubject, combineLatest, from, Observable, of, Subscription, zip} from "rxjs";
import {CollectionName, FirebaseRepository} from "./firebase.repository";
import {AdbRepository} from "./adb.repository";
import {DevicesService} from "../devices.service";
import {filter, flatMap, last, map, tap, toArray} from "rxjs/operators";
import {Device, DeviceStatus, JobTask} from 'pandalab-commons';
import {JobsService} from "../jobs.service";
import {WorkspaceRepository} from "./workspace.repository";
import {TaskStatus} from "pandalab-commons/src/models/job.models";
import {DeviceAdb} from "../../models/adb";

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
            console.log('agentStatus = ', value);
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
        const jobsTasksQuery = this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS)
            .where("status", "==", TaskStatus.pending);
        const devicesQuery = this.firebaseRepo.getCollection(CollectionName.DEVICES)
            .where("status", "==", DeviceStatus.available);
        // .where("agent", '==', this.agentRepo.UUID);
        // const devicesObservable = this.devicesService.listenAgentDevices(this.agentRepo.UUID);
        const devicesObservable = this.firebaseRepo.listenQuery<Device>(devicesQuery);
        const jobsTasksObservable = this.firebaseRepo.listenQuery<JobTask>(jobsTasksQuery);
        const notifier = new BehaviorSubject<any>(null);
        let working = false;
        let notify = false;
        return combineLatest(
            devicesObservable,
            jobsTasksObservable,
            notifier,
            (devices, tasks) => {
                console.log(`Devices = ${devices.length}, working = ${working}`);
                if (working) {
                    notify = true;
                }
                return {
                    devices,
                    tasks
                };
            }
        ).pipe(
            filter(() => !working),
            flatMap(infos => {
                console.log(infos);
                const availableDevicesObservable = of(infos.devices as Device[])
                    .pipe(
                        flatMap(devices => from<Device[]>(devices)),
                        filter(device => {
                            console.log('device available => ', device.status);
                            return device.status === DeviceStatus.available;
                        }),
                        toArray(),
                    );

                const taskDevicesObservable = of(infos.tasks as JobTask[]).pipe(
                    filter(value => value.length > 0),
                    map(tasks => {
                        if (tasks.length > 1) {
                            notify = true;
                        }
                        return tasks[0];
                    }),
                    flatMap(task => {
                        return from(task.devices).pipe(
                            flatMap(deviceId => {
                                const deviceReference = this.firebaseRepo.getCollection(CollectionName.DEVICES).doc(deviceId);
                                return this.firebaseRepo.getDocument<Device>(deviceReference);
                            }),
                            toArray(),
                            map(devices => {
                                return {
                                    task,
                                    devices,
                                }
                            })
                        );
                    }),
                );

                return zip(availableDevicesObservable, taskDevicesObservable, (availableDevices, taskDevices) => {
                    return {
                        availableDevices,
                        taskDevices
                    };
                }).pipe(
                    map(value => {
                        const availableDevices: Device[] = value.availableDevices;
                        const task = value.taskDevices.task;
                        const devices: Device[] = value.taskDevices.devices;

                        const devicesToRun = devices
                            .filter(device => availableDevices
                                .find(availableDevice => device._ref.id === availableDevice._ref.id) !== null
                            );

                        console.log('devicesToRun : ', devicesToRun.length);
                        return {
                            task,
                            devicesToRun,
                        }
                    }),
                    flatMap(infos => {
                        console.log('######################');
                        return this.adbRepo.listenAdb()
                            .pipe(
                                flatMap(value => from<DeviceAdb[]>(value)),
                                flatMap((deviceAdb: DeviceAdb) => {
                                    return this.firebaseRepo.getDocument<Device>(this.firebaseRepo.getCollection(CollectionName.DEVICES).doc(deviceAdb.uid));
                                }),
                                toArray(),
                                map((devicesAdb: Device[]) => {
                                    return {
                                        ...infos,
                                        devicesAdb,
                                    }
                                })
                            );
                    }),
                    tap(async infos => {
                        console.log('ICI');
                        const task: JobTask = infos.task as JobTask;
                        const devicesToRun: Device[] = infos.devicesToRun as Device[];
                        const devicesAdb: Device[] = infos.devicesAdb as Device[];
                        working = true;
                        await this.perform(task, devicesToRun, devicesAdb);
                        working = false;
                        if (notify) {
                            notifier.next(null);
                        }
                    }),
                );
            })
        );
    }

    async perform(task: JobTask, deviceToRun: Device[], deviceAdb: Device[]) {
        // TODO RUN ALL DEVICE
        const device = deviceToRun[0];
        try {
            console.log('perform task device', device);
            await device._ref.set({status: device.status}, {merge: true});
            console.log('Device updated to working : ', device._ref.id);

            task.status = TaskStatus.running;
            await task._ref.set({status: task.status}, {merge: true});
            console.log('Task updated to running : ', task._ref.id);

            const errorDeviceNotPlugged = async () => {
                await task._ref.set(
                    {
                        status: TaskStatus.error,
                        error: `Skip the device is not connected`,
                        completed: true,
                    },
                    {merge: true}
                );
            };
            const runSpoon = async (device: Device) => {
                console.log(device._ref.id);
                console.log(task.job.id);
                const exec = require('util').promisify(require('child_process').exec);
                const reportDirectory = this.workspace.getReportJobDirectory(task.job.id, device._ref.id);
                const fileDebug = `/Users/mehdisli/.pandalab/demo-1.1.18-debug.apk`;
                const fileTest = `/Users/mehdisli/.pandalab/demo-1.1.18-debug-test.apk`;

                const spoonCommands = [
                    `java -jar ${this.workspace.spoonJarPath}`,
                    `--apk ${fileDebug}`,
                    `--test-apk ${fileTest}`,
                    `--sdk ${process.env.ANDROID_HOME}`,
                    `--output ${reportDirectory}`,
                    `-serial ${device.serialId}`,
                ];
                const cmd = spoonCommands.join(' ');
                console.log(`Run : ${cmd}`);
                const {stdout, stderr} = await exec(cmd, {shell: true});
                console.log('stdout:', stdout);
                console.log('stderr:', stderr);
                console.log(`End download apk for job : ${task.job.id}`);

                const fs = require('fs');
                const jsonContent = fs.readFileSync(`${reportDirectory}/result.json`);
                await task._ref.set(
                    {
                        status: TaskStatus.success,
                        result: jsonContent,
                        error: null,
                    },
                    {
                        merge: true
                    }
                );
            };

            const isConnected = deviceAdb.findIndex(value => value.serialId === device.serialId);
            if (!isConnected) {
                await errorDeviceNotPlugged();
            } else {
                await runSpoon(device);
            }

            task.status = TaskStatus.success;
            await task._ref.set({status: task.status}, {merge: true});
            console.log('Task updated to success : ', task._ref.id);
        } catch (e) {
            task.status = TaskStatus.error;
            task.error = e.message;
            await task._ref.set({status: task.error, error: task.error}, {merge: true});
            console.log('Task updated to error : ', task._ref.id);
        } finally {
            device.status = DeviceStatus.available;
            await device._ref.set({status: device.status}, {merge: true});
        }


    }
}
