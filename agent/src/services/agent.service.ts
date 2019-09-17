'use strict';


import {Guid} from "guid-typescript";
import {
    BehaviorSubject,
    combineLatest,
    concat,
    EMPTY,
    from,
    merge,
    Observable,
    of,
    ReplaySubject,
    Subscription,
    Timestamp,
    zip
} from "rxjs";
import {
    catchError,
    endWith,
    first,
    flatMap,
    ignoreElements,
    map,
    startWith,
    tap,
    timeout,
    timestamp,
    toArray
} from "rxjs/operators";
import {DeviceAdb} from "../models/adb";
import {DeviceLog, DeviceLogType} from "../models/device";
import {Device, DeviceStatus} from 'pandalab-commons';
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {AgentRepository, AgentStatus} from "./repositories/agent.repository";
import {AdbRepository} from "./repositories/adb.repository";
import {FirebaseAuthService} from "./firebaseauth.service";
import {DevicesService} from "./devices.service";
import {StoreRepository} from "./repositories/store.repository";
import {doOnSubscribe} from "../utils/rxjs";

export class AgentService {
    private listenDevicesSub: Subscription;
    private manualActions: AgentDeviceData[] = [];

    constructor(public adbRepo: AdbRepository,
                private authService: FirebaseAuthService,
                private firebaseRepo: FirebaseRepository,
                private agentRepo: AgentRepository,
                private deviceService: DevicesService,
                private storeRepo: StoreRepository) {


        this.agentRepo.agentStatus.subscribe(value => {
            switch (value) {
                case AgentStatus.CONFIGURING:
                case AgentStatus.NOT_LOGGED:
                    if (this.listenDevicesSub) {
                        this.listenDevicesSub.unsubscribe();
                        this.listenDevicesSub = null;
                    }
                    break;
                case AgentStatus.READY:
                    this.listenDevicesSub = this.listenDevices().subscribe();
                    break
            }
        })
    }


    get autoEnroll(): boolean {
        return this.storeRepo.load("auto-enroll", "true") == "true"
    }

    set autoEnroll(value: boolean) {
        this.storeRepo.save("auto-enroll", "" + value);
        this.notifyChange()
    }

    get enableTCP(): boolean {
        return this.storeRepo.load("enableTCP", "true") == "true"
    }

    set enableTCP(value: boolean) {
        this.storeRepo.save("enableTCP", "" + value);
        this.notifyChange()
    }


    listenAgentStatus(): Observable<AgentStatus> {
        return this.agentRepo.agentStatus
    }

    private changeBehaviour = new BehaviorSubject("");
    private agentDevicesData: BehaviorSubject<AgentDeviceData[]> = new BehaviorSubject<AgentDeviceData[]>([]);

    public listenAgentDevices(): Observable<AgentDeviceData[]> {
        return this.agentDevicesData;
    }

    private notifyChange() {
        this.changeBehaviour.next("")
    }


    public addManualAction(data: AgentDeviceData) {
        this.manualActions.push(data);
    }


    private cachedDeviceIds : Map<string, { date: number, id: string }>;

    private listenDevices(): Observable<AgentDeviceData[]> {
        this.cachedDeviceIds = new Map<string, { date: number, id: string }>();

        let listenAdbDeviceWithUid: Observable<DeviceAdb[]> = this.adbRepo.listenAdb().pipe(
            flatMap(devices => {
                    return from(devices)
                        .pipe(
                            flatMap((device: DeviceAdb) => {
                                let obs = this.getDeviceUID(device.id);
                                if (this.cachedDeviceIds.has(device.id)) {
                                    let cachedId = this.cachedDeviceIds.get(device.id);
                                    if (cachedId.date > Date.now() - 1000 * 60 * 30) {
                                        obs = of(cachedId.id)
                                    }
                                }
                                return obs
                                    .pipe(
                                        catchError(() => of("")),
                                        map(value => {
                                            device.uid = value;
                                            return device
                                        })
                                    )
                            }),
                            toArray(),
                            map(devices => {


                                //remove device with same id (if connected with cable and tcp)
                                const map = new Map<string, DeviceAdb>();

                                const filteredDevices = [];
                                devices.forEach(d => {
                                    if (d.uid) {
                                        let currentValue = map.get(d.uid);
                                        if (!currentValue || !currentValue.path.startsWith("usb")) {
                                            map.set(d.uid, d)
                                        }
                                    } else {
                                        filteredDevices.push(d)
                                    }
                                });
                                map.forEach((value) => {
                                    filteredDevices.push(value);
                                });

                                //remove cached uid
                                this.cachedDeviceIds.forEach((value, key) => {
                                    if (!map.has(key)) {
                                        this.cachedDeviceIds.delete(key);
                                    }
                                });


                                return filteredDevices;

                            })
                        )
                }
            ));
        let listenAgentDevices = this.deviceService.listenAgentDevices(this.agentRepo.UUID);


        return combineLatest([
            listenAgentDevices,
            listenAdbDeviceWithUid,
            this.changeBehaviour
        ])
            .pipe(
                map(value => <any>{firebaseDevices: value[0], adbDevices: value[1]}),
                map(result => {

                    const devicesData: AgentDeviceData[] = result.adbDevices.map(adbDevice => {
                        return <AgentDeviceData>{
                            actionType: this.autoEnroll ? ActionType.enroll : ActionType.none,
                            adbDevice: adbDevice
                        }
                    });
                    result.firebaseDevices.forEach(device => {
                        const deviceData = devicesData.find(a => {
                            return a.adbDevice && a.adbDevice.uid == device._ref.id;
                        });
                        if (!deviceData) {
                            device.status = DeviceStatus.offline;

                            const canConnect = device.lastTcpActivation && device.lastTcpActivation < Date.now() - 1000*10;

                            devicesData.push(
                                <AgentDeviceData>{
                                    actionType: this.enableTCP && device.ip && canConnect ? ActionType.try_connect : ActionType.none,
                                    firebaseDevice: device
                                }
                            )
                        } else {
                            deviceData.firebaseDevice = device;
                            if (device.status == DeviceStatus.offline) {
                                device.status = DeviceStatus.available;
                                deviceData.actionType = ActionType.update_status;
                            } else if (device.status == DeviceStatus.available && deviceData.adbDevice.path.startsWith("usb") && this.enableTCP &&
                                (!deviceData.firebaseDevice.lastTcpActivation || deviceData.firebaseDevice.lastTcpActivation < Date.now() - 1000*60*60)) {
                                deviceData.actionType = ActionType.enable_tcp;
                            } else {
                                deviceData.actionType = ActionType.none;
                            }
                        }
                    });
                    return devicesData
                }),
                map(devicesData => {
                        const currentDevicesData = this.agentDevicesData.getValue();
                        return devicesData.map((deviceData: AgentDeviceData) => {
                            let currentDeviceData = this.findDataInList(currentDevicesData, deviceData);
                            if (currentDeviceData && currentDeviceData.action && !currentDeviceData.action.isStopped) {
                                return currentDeviceData;


                            } else {

                                let index = this.findIndexDataInList(this.manualActions, deviceData);
                                if (index >= 0) {
                                    deviceData = this.manualActions.splice(index, 1)[0]
                                }
                                switch (deviceData.actionType) {
                                    case ActionType.enroll:
                                        console.log("enroll device", deviceData.adbDevice.id);
                                        deviceData.action = this.startAction(this.enrollAction(deviceData.adbDevice.id));
                                        break;
                                    case ActionType.update_status:
                                        deviceData.action = this.startAction(this.updateDeviceAction(deviceData.firebaseDevice, "save device status"));
                                        break;
                                    case ActionType.try_connect:
                                        deviceData.action = this.startAction(this.tryToConnectAction(deviceData));

                                        break;
                                    case ActionType.enable_tcp:
                                        deviceData.action = this.startAction(this.enableTcpAction(deviceData));
                                        break;
                                    case ActionType.none:

                                        break
                                }
                                return deviceData;
                            }
                        });
                    }
                ),
                tap(data => {
                    this.agentDevicesData.next(data)
                })
            );
    }

    private findIndexDataInList(currentDevicesData: AgentDeviceData[], deviceData: AgentDeviceData): number {
        return currentDevicesData.findIndex((cData: AgentDeviceData) => (cData.adbDevice && deviceData.adbDevice && cData.adbDevice.id === deviceData.adbDevice.id) ||
            (cData.firebaseDevice && deviceData.firebaseDevice && cData.firebaseDevice._ref.id === deviceData.firebaseDevice._ref.id));
    }

    private findDataInList(currentDevicesData: AgentDeviceData[], deviceData: AgentDeviceData) {
        let index = this.findIndexDataInList(currentDevicesData, deviceData);
        return index >= 0 ? currentDevicesData[index] : null
    }

    public getAgentUUID(): string {
        return this.agentRepo.UUID;
    }


    private startAction(action: Observable<Timestamp<DeviceLog>>): BehaviorSubject<Timestamp<DeviceLog>[]> {
        const subject = new BehaviorSubject<Timestamp<DeviceLog>[]>([]);
        action.pipe(
            catchError(err => {
                console.warn("Action error", err);
                return of(<DeviceLog>{log: err, type: DeviceLogType.ERROR})
            }),
            map((log: Timestamp<DeviceLog>) => {
                let logs = subject.getValue();
                logs.push(log);
                console.log(" - action log : " + log.value.log);
                return logs;
            }))
            .subscribe(value => {
                subject.next(value)

            }, error => {
                console.error("Action finish with error", error);
                subject.complete()
            }, () => {
                subject.complete();
                //this.notifyChange()
            });
        return subject;
    }

    private enableTcpAction(device: AgentDeviceData): Observable<Timestamp<DeviceLog>> {
        device.firebaseDevice.lastTcpActivation = Date.now();
        return concat(
            this.updateDeviceAction(device.firebaseDevice, "save device status"),
            this.adbRepo.enableTcpIp(device.adbDevice.id)
                .pipe(
                    map(() => <DeviceLog>{log: "enable tcp command sent", type: DeviceLogType.INFO}),
                    startWith(<DeviceLog>{
                        log: "try to enable tcp",
                        type: DeviceLogType.INFO
                    }),
                    timestamp()
                )
        )

    }

    private tryToConnectAction(device: AgentDeviceData): Observable<Timestamp<DeviceLog>> {
        return concat(
            this.updateDeviceAction(device.firebaseDevice, "save device status"),
            this.adbRepo.connectIp(device.firebaseDevice.ip)
                .pipe(
                    startWith(<DeviceLog>{
                        log: "try to connect to ip " + device.firebaseDevice.ip,
                        type: DeviceLogType.INFO
                    }),
                    endWith(<DeviceLog>{log: "connected to device", type: DeviceLogType.INFO}),
                    catchError(err => {
                        console.warn("Can't connect to device on " + device.firebaseDevice.ip, err);
                        device.firebaseDevice.ip = "";
                        device.firebaseDevice.lastTcpActivation = 0;
                        return this.updateDeviceAction(device.firebaseDevice, "Remove device ip");
                    }),
                    timestamp(),
                )
        )
    }

    private updateDeviceAction(device: Device, message: string): Observable<Timestamp<DeviceLog>> {
        return this.deviceService.updateDevice(device)
            .pipe(
                ignoreElements(),
                startWith(<DeviceLog>{log: message, type: DeviceLogType.INFO}),
                endWith(<DeviceLog>{log: "update success", type: DeviceLogType.INFO}),
                timestamp()
            )
    }

    private enrollAction(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject<DeviceLog>();
        subject.next({log: 'Install service APK...', type: DeviceLogType.INFO});

        const enrollObs: Observable<DeviceLog> = this.adbRepo.installApk(adbDeviceId, this.agentRepo.getAgentApk())
            .pipe(
                tap(() => subject.next({log: `Retrieve device uid...`, type: DeviceLogType.INFO})),
                flatMap(() => this.getDeviceUID(adbDeviceId)),
                tap(() => subject.next({log: `Generate firebase token...`, type: DeviceLogType.INFO})),
                flatMap(uuid => this.authService.createDeviceToken(uuid)
                    .pipe(map(token => {
                        return {uuid: uuid, token: token}
                    }))),
                tap(() => subject.next({log: 'Launch of the service...', type: DeviceLogType.INFO})),


                flatMap(result => this.adbRepo.sendBroadcastWithData(adbDeviceId, "com.leroymerlin.pandalab/.AgentReceiver",
                    'com.leroymerlin.pandalab.INTENT.ENROLL', {
                        'token_id': result.token,
                        'agent_id': this.getAgentUUID()
                    })
                    .pipe(map(() => result))),
                tap(() => subject.next({log: 'Wait for the device in database...', type: DeviceLogType.INFO})),
                flatMap(result => this.firebaseRepo.listenDocument(CollectionName.DEVICES, result.uuid)),
                first(device => device !== null),
                tap(() => {
                    subject.next({log: 'Device enrolled ...', type: DeviceLogType.INFO});
                    subject.complete()
                }),
                flatMap(() => EMPTY),
            ) as Observable<DeviceLog>;

        return merge(subject, enrollObs)
            .pipe(
                timeout(50000),
                catchError(error => of(<DeviceLog>{log: 'Error: ' + error, type: DeviceLogType.ERROR})),
                timestamp()
            )
    }

    public getDeviceAdb(id: string): Observable<DeviceAdb|null> {
        return this.adbRepo.getDevices().pipe(
            flatMap(devices => {
                return from(devices).pipe(
                    flatMap(device => {
                        return this.getDeviceUID(device.id).pipe(map(id => {
                            return {
                                id,
                                device,
                            };
                        }));
                    }),
                    first(tuple => tuple.id === id, null),
                    map(tuple => tuple.device),
                );
            })
        );
    }


    private getDeviceUID(deviceId: string): Observable<string> {

        const transactionId = Guid.create().toString();
        const logcatObs = this.adbRepo.readAdbLogcat(deviceId, transactionId)
            .pipe(
                map(message => {
                    let parse = JSON.parse(message);
                    return parse.device_id
                }),
                first(),
                timeout(5000)
            );

        const sendTransaction = this.adbRepo.sendBroadcastWithData(deviceId,
            "com.leroymerlin.pandalab/.AgentReceiver",
            "com.leroymerlin.pandalab.INTENT.GET_ID", {"transaction_id": transactionId});

        return this.adbRepo.isInstalled(deviceId, 'com.leroymerlin.pandalab')
            .pipe(
                flatMap(installed => {
                    if (!installed) {
                        throw AgentError.notInstalled()
                    }
                    return zip(logcatObs, sendTransaction)
                }),
                map(values => values[0])
            )
    }
}

export interface AgentDeviceData {

    actionType: ActionType,
    adbDevice: DeviceAdb,
    firebaseDevice: Device,
    action: BehaviorSubject<Timestamp<DeviceLog>[]>

}


export enum ActionType {
    enroll,
    try_connect,
    update_status,
    enable_tcp,
    none
}

class AgentError extends Error {

    static APP_NOT_INSTALLED: string = "App is not installed on device";


    static notInstalled() {
        return new AgentError(AgentError.APP_NOT_INSTALLED)
    }

    private constructor(public message: string) {
        super(message);
    }

}
