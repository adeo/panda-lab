'use strict';
import {
    BehaviorSubject,
    combineLatest,
    concat,
    from,
    Observable,
    of,
    ReplaySubject,
    Subscription,
    Timestamp
} from "rxjs";
import {catchError, delay, first, flatMap, ignoreElements, map, retry, tap, timeout, timestamp} from "rxjs/operators";
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

    static MOBILE_AGENT_PACKAGE = 'com.leroymerlin.pandalab';


    private listenDevicesSub: Subscription;
    private manualActions: AgentDeviceData[] = [];
    private changeBehaviour = new BehaviorSubject("");
    private agentDevicesData: BehaviorSubject<AgentDeviceData[]> = new BehaviorSubject<AgentDeviceData[]>([]);

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

    public addManualAction(data: AgentDeviceData, type: ActionType) {
        let newData = data.copyData();
        newData.actionType = type;
        this.manualActions.push(newData);
        this.notifyChange()
    }

    private notifyChange() {
        this.changeBehaviour.next("")
    }

    private listenDevices(): Observable<AgentDeviceData[]> {
        let listenAdbDeviceWithUid: Observable<DeviceAdb[]> = this.adb.listenAdb();
        let listenAgentDevices = this.agentsService.listenAgentDevices(this.setupService.UUID);
        return combineLatest([
            listenAgentDevices,
            listenAdbDeviceWithUid,
            this.changeBehaviour
        ])
            .pipe(
                map(result => this.generateDevicesData(result[1], result[0])),
                map(devicesData => this.calculateDeviceActions(devicesData)),
                tap(data => this.agentDevicesData.next(data.sort((a, b) => {
                    return a.getDataSerialID() < b.getDataSerialID() ? -1 : 1;
                }))),
            );
    }

    private calculateDeviceActions(devicesData): AgentDeviceData[] {
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
                    deviceData = this.manualActions.splice(index, 1)[0];
                    this.logger.info("Start manual action " + deviceData.actionType);
                }
                switch (deviceData.actionType) {
                    case ActionType.enroll:
                        this.logger.info("enroll device", deviceData.adbDevice.id);
                        deviceData.action = this.startAction(deviceData.actionType, this.enrollAction(deviceData.adbDevice));
                        break;
                    case ActionType.update_app:
                        this.logger.info("update client app", deviceData.adbDevice.id);
                        deviceData.action = this.startAction(deviceData.actionType, this.installClientAppAction(deviceData.adbDevice.id));
                        break;
                    case ActionType.update_status:
                        deviceData.action = this.startAction(deviceData.actionType, this.saveDeviceAction(deviceData.firebaseDevice, "Save device status to " + deviceData.firebaseDevice.status));
                        break;
                    case ActionType.try_connect:
                        deviceData.action = this.startAction(deviceData.actionType, this.tryToConnectAction(deviceData));
                        break;
                    case ActionType.enable_tcp:
                        this.logger.info("enable_tcp");
                        deviceData.action = this.startAction(deviceData.actionType, this.enableTcpAction(deviceData));
                        break;
                    case ActionType.none:
                        break
                }
                return deviceData;
            }
        });
    }

    private generateDevicesData(adbDevices: DeviceAdb[], firebaseDevices: Device[]) {
        const devicesData: AgentDeviceData[] = adbDevices.map(adbDevice => {
            let agentDeviceData = new AgentDeviceData();
            agentDeviceData.actionType = this.autoEnroll ? ActionType.enroll : ActionType.none;
            agentDeviceData.adbDevice = adbDevice;
            return agentDeviceData
        });

        firebaseDevices.forEach(device => {
            const deviceData = devicesData.find(a => a.adbDevice && a.adbDevice.serialId == device.serialId);
            if (!deviceData) {
                const isBooked = device.status == DeviceStatus.booked;
                const isOffline = device.status == DeviceStatus.offline;
                if (!isBooked && !isOffline) {
                    device.status = DeviceStatus.offline;
                }
                const canConnect = device.lastTcpActivation && device.lastTcpActivation >=0 && device.lastTcpActivation < Date.now() - 1000 * 10;
                let agentDeviceData = new AgentDeviceData();
                agentDeviceData.actionType = this.enableTCP && device.ip && canConnect && isOffline ? ActionType.try_connect : !isBooked && !isOffline ? ActionType.update_status : ActionType.none;
                agentDeviceData.firebaseDevice = device;
                devicesData.push(agentDeviceData)
            } else if (deviceData.adbDevice.agentInstalled) {
                deviceData.firebaseDevice = device;
                if (device.status == DeviceStatus.offline || !device.status) {
                    device.status = DeviceStatus.available;
                    deviceData.actionType = ActionType.update_status;
                } else if (device.appBuildTime < this.setupService.getAgentPublishTime()) {
                    deviceData.actionType = ActionType.update_app;
                } else if (deviceData.canActivateTCP() && this.enableTCP) {
                    deviceData.actionType = ActionType.enable_tcp;
                } else {
                    deviceData.actionType = ActionType.none;
                }
            }
        });
        return devicesData;
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

    private startAction(type: ActionType, action: Observable<DeviceLog>): ReplaySubject<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject<Timestamp<DeviceLog>>();
        action.pipe(
            catchError(err => {
                this.logger.warn("Action error", err);
                return of(<DeviceLog>{log: err, type: DeviceLogType.ERROR})
            }),
            map((log: DeviceLog) => {
                log.log = "[" + type + "] " + log.log;
                return log;
            }),
            timestamp(),)
            .subscribe((value: Timestamp<DeviceLog>) => {
                this.logger.info(value.value.log);
                subject.next(value)
            }, error => {
                this.logger.error(type + " - Action finish with error", error);
                subject.complete()
            }, () => {
                subject.complete();
            });
        return subject;
    }

    private enableTcpAction(device: AgentDeviceData): Observable<DeviceLog> {
        device.firebaseDevice.lastTcpActivation = Date.now();
        return concat(
            of(<DeviceLog>{log: "try to enable tcp", type: DeviceLogType.INFO}),
            this.adb.enableTcpIp(device.adbDevice.id).pipe(map(() => <DeviceLog>{
                log: "enable tcp command sent",
                type: DeviceLogType.INFO
            })),
            of("").pipe(delay(8000), flatMap(() => this.saveDeviceAction(device.firebaseDevice, "Save device status"))),
            from(this.updateDeviceInfos(device.firebaseDevice._ref.id)).pipe(ignoreElements()),
        )
    }

    private tryToConnectAction(device: AgentDeviceData): Observable<DeviceLog> {
        return concat(
            this.saveDeviceAction(device.firebaseDevice, "save device status"),
            of(<DeviceLog>{log: "try to connect to ip " + device.firebaseDevice.ip, type: DeviceLogType.INFO}),
            this.adb.connectIp(device.firebaseDevice.ip).pipe(
                ignoreElements(),
                catchError(err => {
                    let errorMsg = "Can't connect to device on " + device.firebaseDevice.ip;
                    this.logger.warn(errorMsg, err);
                    device.firebaseDevice.ip = "";
                    device.firebaseDevice.lastTcpActivation = 0;
                    return concat<DeviceLog>(
                        of(<DeviceLog>{log: errorMsg, type: DeviceLogType.ERROR}),
                        this.saveDeviceAction(device.firebaseDevice, "Remove device ip"),
                    );
                }),
            ),
        )
    }

    private saveDeviceAction(device: Device, message: string): Observable<DeviceLog> {
        return concat(
            of(<DeviceLog>{log: message, type: DeviceLogType.INFO}),
            this.devicesService.updateDevice(device).pipe(ignoreElements()),
            of(<DeviceLog>{log: "Update success", type: DeviceLogType.INFO})
        );
    }

    private installClientAppAction(adbDeviceId: string): Observable<DeviceLog> {
        return concat(
            of(<DeviceLog>{log: 'Install service APK...', type: DeviceLogType.INFO}),
            this.adb.installApk(adbDeviceId, this.setupService.getAgentApk()).pipe(ignoreElements()),
            of(<DeviceLog>{log: 'Waiting app detection...', type: DeviceLogType.INFO}),
            this.adb.isInstalled(adbDeviceId, AgentService.MOBILE_AGENT_PACKAGE).pipe(
                delay(500),
                map((installed) => {
                    if (!installed) {
                        throw AgentError.notInstalled()
                    }
                }),
                retry(),
                timeout(10000),
                ignoreElements(),
            ),
            of(<DeviceLog>{log: `Open main activity...`, type: DeviceLogType.INFO}),
            this.adb.launchActivity(adbDeviceId, AgentService.MOBILE_AGENT_PACKAGE + "/.HomeActivity").pipe(ignoreElements()),
            of(<DeviceLog>{log: `App installed`, type: DeviceLogType.INFO}),
        );
    }

    private enrollAction(adbDevice: DeviceAdb): Observable<DeviceLog> {
        return concat<DeviceLog>(
            this.installClientAppAction(adbDevice.id),
            of(<DeviceLog>{log: `Generate firebase token...`, type: DeviceLogType.INFO}),
            this.authService.createDeviceToken(adbDevice.serialId)
                .pipe(
                    flatMap(token => this.adb.sendBroadcastWithData(
                        adbDevice.id,
                        "com.leroymerlin.pandalab/.AgentReceiver",
                        'com.leroymerlin.pandalab.INTENT.ENROLL',
                        {
                            'token_id': token,
                            'agent_id': this.getAgentUUID(),
                            'serial_id': adbDevice.serialId,
                        }
                    )),
                    ignoreElements(),
                ),
            of(<DeviceLog>{log: `Wait for the device in database...`, type: DeviceLogType.INFO}),
            this.devicesService.listenDevice(adbDevice.serialId).pipe(
                first(device => device !== null),
                flatMap((device: Device) => {
                    let deviceData = this.devicesRepo.searchDeviceData(device.phoneDevice);
                    if (deviceData) {
                        device.pictureIcon = deviceData.url;
                    }
                    return this.saveDeviceAction(device, "Store device image");
                })),
            of(<DeviceLog>{log: `Device enrolled !`, type: DeviceLogType.INFO})
        ).pipe(timeout(60000))

    }


    isConfigured(): Promise<boolean> {
        return this.listenAgentStatus().pipe(
            map(value => value == AgentStatus.READY),
            first(),
        ).toPromise()
    }


}

export class AgentDeviceData {
    actionType: ActionType;
    adbDevice: DeviceAdb;
    firebaseDevice?: Device;
    action: ReplaySubject<Timestamp<DeviceLog>>;

    public copyData(): AgentDeviceData {
        let data = new AgentDeviceData();
        data.adbDevice = this.adbDevice;
        data.firebaseDevice = this.firebaseDevice;
        return data;
    }

    public getDataSerialID(): string {
        if (this.adbDevice) {
            return this.adbDevice.serialId;
        } else if (this.firebaseDevice.serialId) {
            return this.firebaseDevice.serialId;
        }
        return "";
    }

    public canActivateTCP(): boolean {
        if (this.firebaseDevice && this.adbDevice) {
            return this.firebaseDevice.status == DeviceStatus.available && this.adbDevice.path.startsWith("usb") &&
                (!this.firebaseDevice.lastTcpActivation || this.firebaseDevice.lastTcpActivation < Date.now() - 1000 * 60 * 30);
        }
        return false;
    }

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
