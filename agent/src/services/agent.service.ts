import {
    BehaviorSubject,
    combineLatest,
    from,
    merge,
    Observable,
    of,
    onErrorResumeNext,
    ReplaySubject,
    Subscription,
    Timestamp,
    zip
} from "rxjs";
import {AdbRepository} from "./repositories/adb.repository";
import {Guid} from "guid-typescript";
import {
    catchError,
    filter,
    first,
    flatMap,
    ignoreElements,
    map,
    tap,
    timeout,
    timestamp,
    toArray
} from "rxjs/operators";
import {DeviceLog, DeviceLogType} from "../models/device";
import {FirebaseAuthService} from "./auth.service";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {AgentRepository, AgentStatus} from "./repositories/agent.repository";
import {DevicesService} from "./devices.service";
import {DeviceAdb} from "../models/adb";
import {DeviceStatus} from "pandalab-commons";
import {EMPTY} from "rxjs/src/internal/observable/empty";

export class AgentService {
    private listenDevicesSub: Subscription;

    constructor(private adbRepo: AdbRepository,
                private authService: FirebaseAuthService,
                private firebaseRepo: FirebaseRepository,
                private agentRepo: AgentRepository,
                private deviceService: DevicesService) {


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

    private listenDevices(): Observable<void> {


        let listenAdbDeviceWithUid: Observable<DeviceAdb[]> = this.adbRepo.listenAdb().pipe(
            flatMap(from),
            flatMap((device: DeviceAdb) => {
                    return this.getDeviceUID(device.id)
                        .pipe(
                            onErrorResumeNext(() => of("")),
                            map(value => {
                                device.uid = value;
                                return device
                            })
                        )
                },
                toArray())
        );

        const changeBehaviour = new BehaviorSubject("");
        let hasChange = false;
        let working = false;

        combineLatest(
            this.deviceService.listenAgentDevices(this.agentRepo.UUID),
            listenAdbDeviceWithUid,
            changeBehaviour,
            (firebaseDevices, adbDevices) => {
                if (working) {
                    hasChange = true;
                }
                return {firebaseDevices: firebaseDevices, adbDevices: adbDevices}
            }
        ).pipe(
            //lock listening
            filter(() => !working),
            tap(() => working = true),

            flatMap(result => {
                const actions: DeviceActionModel[] = result.adbDevices.map(adbDevice => {
                    return <DeviceActionModel>{
                        action: DeviceAction.enroll,
                        adbDevice: adbDevice
                    }
                });
                result.firebaseDevices.forEach(device => {
                    const action = actions.find(a => a.adbDevice.uid === device._ref.id);
                    if (!action) {
                        device.status = DeviceStatus.offline;
                        actions.push(
                            <DeviceActionModel>{
                                action: DeviceAction.try_connect,
                                firebaseDevice: device
                            }
                        )
                    } else {
                        action.firebaseDevice = device;
                        if (device.status == DeviceStatus.offline) {
                            device.status = DeviceStatus.available;
                            action.action = DeviceAction.update_status;
                        } else {
                            action.action = DeviceAction.none;
                        }
                    }
                });
                return from(actions)
            }),

            flatMap(action => {
                switch (action.action) {
                    case DeviceAction.enroll:
                        return this.enroll(action.adbDevice.id);
                    case DeviceAction.update_status:
                        return this.deviceService.updateDevice(action.firebaseDevice);
                    case DeviceAction.try_connect:
                        return this.deviceService.updateDevice(action.firebaseDevice)
                            .pipe(flatMap(() => this.adbRepo.connectIp(action.firebaseDevice.ip)));
                    case DeviceAction.none:
                        return EMPTY
                }
            }),
            toArray(),
            //unlock listening
            tap(() => {
                working = false;
                if (hasChange) {
                    changeBehaviour.next("");
                }
            }),
        )
    }


    enroll(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject();
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
                flatMap(result => this.adbRepo.launchActivityWithToken(adbDeviceId, 'com.leroymerlin.pandalab/.home.HomeActivity', result.token, result.uuid)
                    .pipe(map(() => result))),
                tap(() => subject.next({log: 'Wait for the device in database...', type: DeviceLogType.INFO})),
                flatMap(result => this.firebaseRepo.listenDocument(CollectionName.DEVICES, result.uuid)),
                first(device => device !== null),
                ignoreElements<>()
            );

        return merge(subject, enrollObs)
            .pipe(
                timeout(50000),
                catchError(error => of({log: 'Error: ' + error, type: DeviceLogType.ERROR})),
                timestamp()
            )
    }


    private getDeviceUID(deviceId: string): Observable<string> {
        const transactionId = Guid.create().toString();

        const logcatObs = this.adbRepo.readAdbLogcat(deviceId, transactionId)
            .pipe(
                first(),
                timeout(5000)
            );

        const sendTransaction = this.adbRepo.launchActivityWithToken(deviceId,
            'com.leroymerlin.pandalab/.GenerateUniqueId',
            transactionId,
            this.UUID);

        return this.adbRepo.isInstalled(deviceId, 'com.leroymerlin.pandalab')
            .pipe(
                flatMap(installed => {
                    if (!installed) {
                        throw AgentError.notInstalled()
                    }
                    return zip(logcatObs, sendTransaction)
                }),
                map(values => JSON.parse(values[0]).device_id as string)
            )
    }
}

interface DeviceActionModel {

    action: DeviceAction
    adbDevice: DeviceAdb,
    firebaseDevice: Device,
}

enum DeviceAction {
    enroll,
    try_connect,
    update_status,
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
