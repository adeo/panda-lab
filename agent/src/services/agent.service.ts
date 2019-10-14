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
    debounceTime,
    delay,
    endWith,
    first,
    flatMap,
    ignoreElements,
    map, retry,
    startWith,
    tap,
    timeout,
    timestamp,
    toArray
} from "rxjs/operators";
import {DeviceAdb} from "../models/adb";
import {DeviceLog, DeviceLogType} from "../models/device";
import {Device, DeviceStatus} from 'pandalab-commons';
import {FirebaseRepository} from "./repositories/firebase.repository";
import {AgentStatus, SetupService} from "./node/setup.service";
import {AdbService} from "./node/adb.service";
import {FirebaseAuthService} from "./firebaseauth.service";
import {DevicesService} from "./devices.service";
import {StoreRepository} from "./repositories/store.repository";
import * as winston from "winston";
import {AgentsService} from "./agents.service";
import {DevicesRepository} from "./repositories/devices.repository";

export class AgentService {
    private listenDevicesSub: Subscription;
    private manualActions: AgentDeviceData[] = [];
    private changeBehaviour = new BehaviorSubject("");
    private agentDevicesData: BehaviorSubject<AgentDeviceData[]> = new BehaviorSubject<AgentDeviceData[]>([]);

    private cachedDeviceAppInfos: Map<string, { date: number, appInfos: AppInfos }>;
    private currentAdbDevices: DeviceAdb[] = [];


    constructor(private logger: winston.Logger,
                public adb: AdbService,
                private authService: FirebaseAuthService,
                private firebaseRepo: FirebaseRepository,
                private setupService: SetupService,
                private devicesService: DevicesService,
                private devicesRepo: DevicesRepository,
                private agentsService: AgentsService,
                private storeRepo: StoreRepository) {
        this.setupService.agentStatus.subscribe(value => {
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
        return this.setupService.agentStatus
    }

    reloadAdb() {
        return this.adb.restartAdbTracking()
    }


    public listenAgentDevices(): Observable<AgentDeviceData[]> {
        return this.agentDevicesData;
    }

    public updateDeviceInfos(deviceUid: string) {
        return this.firebaseRepo.firebase.functions().httpsCallable("updateDeviceInfos")({uid: deviceUid})
    }

    private notifyChange() {
        this.changeBehaviour.next("")
    }

    public addManualAction(data: AgentDeviceData) {
        this.manualActions.push(data);
        this.notifyChange()
    }


    private listenDevices(): Observable<AgentDeviceData[]> {
        this.cachedDeviceAppInfos = new Map();
        let listenAdbDeviceWithUid: Observable<DeviceAdb[]> = this.adb.listenAdb();
        let listenAgentDevices = this.agentsService.listenAgentDevices(this.setupService.UUID);
        return combineLatest([
            listenAgentDevices,
            listenAdbDeviceWithUid,
            this.changeBehaviour
        ])
            .pipe(
                debounceTime(200),
                map(value => <{ firebaseDevices: Device[], adbDevices: DeviceAdb[] }>{
                    firebaseDevices: value[0],
                    adbDevices: value[1]
                }),
                flatMap(value => this.getDevicesUID(value.adbDevices).pipe(map(devices => {
                    value.adbDevices = devices;
                    this.currentAdbDevices = devices;
                    return value;
                }))),
                map(result => {
                    const devicesData: AgentDeviceData[] = result.adbDevices.map(adbDevice => {
                        return <AgentDeviceData>{
                            actionType: this.autoEnroll ? ActionType.enroll : ActionType.none,
                            adbDevice: adbDevice
                        }
                    });
                    result.firebaseDevices.forEach(device => {
                        const deviceData = devicesData.find(a => a.adbDevice && a.adbDevice.uid == device._ref.id);
                        if (!deviceData) {
                            const isBooked = device.status == DeviceStatus.booked;
                            const isOffline = device.status == DeviceStatus.offline;
                            if (!isBooked && !isOffline) {
                                device.status = DeviceStatus.offline;
                            }
                            const canConnect = device.lastTcpActivation && device.lastTcpActivation < Date.now() - 1000 * 10;
                            devicesData.push(
                                <AgentDeviceData>{
                                    actionType: this.enableTCP && device.ip && canConnect && isOffline ? ActionType.try_connect : !isBooked && !isOffline ? ActionType.update_status : ActionType.none,
                                    firebaseDevice: device
                                }
                            )
                        } else {
                            deviceData.firebaseDevice = device;
                            if (deviceData.adbDevice.appBuildTime < this.setupService.getAgentPublishTime()) {
                                deviceData.actionType = ActionType.update_app;
                            } else if (device.status == DeviceStatus.offline || !device.status) {
                                device.status = DeviceStatus.available;
                                deviceData.actionType = ActionType.update_status;
                            } else if (device.status == DeviceStatus.available && deviceData.adbDevice.path.startsWith("usb") && this.enableTCP &&
                                (!deviceData.firebaseDevice.lastTcpActivation || deviceData.firebaseDevice.lastTcpActivation < Date.now() - 1000 * 60 * 60)) {
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
                                //we update current data values but let the current action finish
                                deviceData.action = currentDeviceData.action;
                                deviceData.actionType = currentDeviceData.actionType;
                                return deviceData;
                            } else {
                                let index = this.findIndexDataInList(this.manualActions, deviceData);
                                if (index >= 0) {
                                    deviceData = this.manualActions.splice(index, 1)[0]
                                }
                                switch (deviceData.actionType) {
                                    case ActionType.enroll:
                                        this.logger.info("enroll device", deviceData.adbDevice.id);
                                        deviceData.action = this.startAction(deviceData.actionType, this.enrollAction(deviceData.adbDevice.id));
                                        break;
                                    case ActionType.update_app:
                                        this.logger.info("update client app", deviceData.adbDevice.id);
                                        deviceData.action = this.startAction(deviceData.actionType, this.installClientAppAction(deviceData.adbDevice.id));
                                        break;
                                    case ActionType.update_status:
                                        deviceData.action = this.startAction(deviceData.actionType, this.updateDeviceAction(deviceData.firebaseDevice, "save device status"));
                                        break;
                                    case ActionType.try_connect:
                                        deviceData.action = this.startAction(deviceData.actionType, this.tryToConnectAction(deviceData));
                                        break;
                                    case ActionType.enable_tcp:
                                        deviceData.action = this.startAction(deviceData.actionType, this.enableTcpAction(deviceData));
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

    private getDevicesUID(adbDevices: DeviceAdb[]): Observable<DeviceAdb[]> {
        return from(adbDevices)
            .pipe(
                flatMap((device: DeviceAdb) => {
                    let obs = this.getAppInfos(device.id);
                    if (this.cachedDeviceAppInfos.has(device.id)) {
                        let cachedId = this.cachedDeviceAppInfos.get(device.id);
                        if (cachedId.date > Date.now() - 1000 * 60 * 30) {
                            obs = of(cachedId.appInfos)
                        }
                    }
                    return obs
                        .pipe(
                            catchError(error => {
                                this.logger.warn("can't get device uid - ", error);
                                return of(<AppInfos>{deviceUid: "", buildTime: -1})
                            }),
                            map(value => {
                                if (value && !this.cachedDeviceAppInfos.has(device.id)) {
                                    this.cachedDeviceAppInfos.set(device.id, {date: Date.now(), appInfos: value})
                                }

                                device.uid = value.deviceUid;
                                device.appBuildTime = value.buildTime;
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
                    this.cachedDeviceAppInfos.forEach((value, key) => {
                        if (!map.has(value.appInfos.deviceUid)) {
                            this.cachedDeviceAppInfos.delete(key);
                        }
                    });
                    return filteredDevices;
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
        return this.setupService.UUID;
    }

    private startAction(type: ActionType, action: Observable<Timestamp<DeviceLog>>): ReplaySubject<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject<Timestamp<DeviceLog>>();
        action.pipe(
            catchError(err => {
                this.logger.warn("Action error", err);
                return of(<DeviceLog>{log: err, type: DeviceLogType.ERROR}).pipe(timestamp())
            }),
            map((log: Timestamp<DeviceLog>) => {
                log.value.log = "[" + type + "] " + log.value.log;
                return log;
            }))
            .subscribe((value: Timestamp<DeviceLog>) => {
                this.logger.info(value.value.log);
                subject.next(value)
            }, error => {
                this.logger.error(type + " - Action finish with error", error);
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
            this.adb.enableTcpIp(device.adbDevice.id)
                .pipe(
                    map(() => <DeviceLog>{log: "enable tcp command sent", type: DeviceLogType.INFO}),
                    startWith(<DeviceLog>{
                        log: "try to enable tcp",
                        type: DeviceLogType.INFO
                    }),
                    timestamp()
                ),
            of("").pipe(delay(500), flatMap(() => this.updateDeviceAction(device.firebaseDevice, "save device status")))
        ).pipe(
            tap(() => this.updateDeviceInfos(device.firebaseDevice._ref.id))
        )
    }

    private tryToConnectAction(device: AgentDeviceData): Observable<Timestamp<DeviceLog>> {
        return concat(
            this.updateDeviceAction(device.firebaseDevice, "save device status"),
            this.adb.connectIp(device.firebaseDevice.ip)
                .pipe(
                    startWith(<DeviceLog>{
                        log: "try to connect to ip " + device.firebaseDevice.ip,
                        type: DeviceLogType.INFO
                    }),
                    timestamp(),
                    catchError(err => {
                        let errorMsg = "Can't connect to device on " + device.firebaseDevice.ip;
                        this.logger.warn(errorMsg, err);
                        device.firebaseDevice.ip = "";
                        device.firebaseDevice.lastTcpActivation = 0;
                        return this.updateDeviceAction(device.firebaseDevice, "Remove device ip")
                            .pipe(
                                startWith<Timestamp<DeviceLog>>({
                                    value: {log: errorMsg, type: DeviceLogType.ERROR},
                                    timestamp: Date.now()
                                }));
                    }),
                )
        )
    }

    private updateDeviceAction(device: Device, message: string): Observable<Timestamp<DeviceLog>> {
        return this.devicesService.updateDevice(device)
            .pipe(
                ignoreElements(),
                startWith(<DeviceLog>{log: message, type: DeviceLogType.INFO}),
                endWith(<DeviceLog>{log: "update success", type: DeviceLogType.INFO}),
                timestamp()
            )
    }

    private installClientAppAction(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
        return concat(
            of(<DeviceLog>{log: 'Install service APK...', type: DeviceLogType.INFO}),
            this.adb.installApk(adbDeviceId, this.setupService.getAgentApk()),
            of(<DeviceLog>{log: `Open main activity...`, type: DeviceLogType.INFO}),
            this.adb.launchActivity(adbDeviceId, "com.leroymerlin.pandalab/.home.HomeActivity"),
        ).pipe(
            timestamp()
        );
    }

    private enrollAction(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject<DeviceLog>();
        subject.next({log: `Retrieve device uid...`, type: DeviceLogType.INFO});
        const enrollObs: Observable<DeviceLog> = this.getAppInfos(adbDeviceId)
            .pipe(
                tap(() => subject.next({log: `Generate firebase token...`, type: DeviceLogType.INFO})),
                flatMap(infos => this.authService.createDeviceToken(infos.deviceUid)
                    .pipe(map(token => {
                        return {uuid: infos.deviceUid, token: token}
                    }))),
                tap(() => subject.next({log: 'Launch of the service...', type: DeviceLogType.INFO})),
                flatMap(result => this.adb.sendBroadcastWithData(adbDeviceId, "com.leroymerlin.pandalab/.AgentReceiver",
                    'com.leroymerlin.pandalab.INTENT.ENROLL', {
                        'token_id': result.token,
                        'agent_id': this.getAgentUUID()
                    })
                    .pipe(map(() => result))),
                tap(() => subject.next({log: 'Wait for the device in database...', type: DeviceLogType.INFO})),
                flatMap(result => this.devicesService.listenDevice(result.uuid)),
                first(device => device !== null),
                tap(() => {
                    subject.next({log: 'Device enrolled ...', type: DeviceLogType.INFO});
                    subject.complete()
                }),
                flatMap((device: Device) => {
                    let deviceData = this.devicesRepo.searchDeviceData(device.name);
                    if (deviceData) {
                        device.pictureIcon = deviceData.url;
                    }
                    return this.updateDeviceAction(device, "Store device image");
                }),
                flatMap(() => EMPTY),
            ) as Observable<DeviceLog>;
        return concat(
            this.installClientAppAction(adbDeviceId),
            merge(subject, enrollObs).pipe(timestamp())
        ).pipe(
            timeout(50000),
            catchError(error => of(<DeviceLog>{log: error, type: DeviceLogType.ERROR}).pipe(timestamp()))
        );
    }


    public getDeviceAdb(firebaseId: string): Observable<DeviceAdb | null> {
        return from(this.currentAdbDevices).pipe(
            first(value => value.uid === firebaseId),
        );
    }

    private getAppInfos(deviceId: string): Observable<AppInfos> {
        const transactionId = Guid.create().toString();
        const logcatObs = this.adb.readAdbLogcat(deviceId, transactionId)
            .pipe(
                map(message => {
                    let parse = JSON.parse(message.trim());
                    console.log("Jaime quand ca marche", parse);
                    return <AppInfos>{deviceUid: parse.device_id, buildTime: parse.build_time}
                }),
                first(),
                timeout(10000)
            );

        const sendTransaction = of("").pipe(delay(500), flatMap(() => this.adb.sendBroadcastWithData(deviceId,
            "com.leroymerlin.pandalab/.AgentReceiver",
            "com.leroymerlin.pandalab.INTENT.GET_ID", {"transaction_id": transactionId})));
        return this.adb.isInstalled(deviceId, 'com.leroymerlin.pandalab')
            .pipe(
                flatMap(installed => {
                    if (!installed) {
                        this.logger.warn("Can't get app infos, app not installed");
                        throw AgentError.notInstalled()
                    }
                    return zip(logcatObs, sendTransaction)
                    //.pipe(retry(1))
                }),
                map(values => values[0])
            )
    }

    isConfigured(): Promise<boolean> {
        return this.listenAgentStatus().pipe(
            map(value => value == AgentStatus.READY),
            first(),
        ).toPromise()
    }
}

export interface AppInfos {
    deviceUid: string,
    buildTime: number
}

export interface AgentDeviceData {
    actionType: ActionType,
    adbDevice: DeviceAdb,
    firebaseDevice?: Device,
    action: ReplaySubject<Timestamp<DeviceLog>>
}

export enum ActionType {
    enroll = 'enroll',
    try_connect = 'try_connect',
    update_app = 'update_app',
    update_status = 'update_status',
    enable_tcp = 'enable_tcp',
    none = 'none'
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
