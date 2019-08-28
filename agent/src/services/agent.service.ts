import {merge, Observable, of, ReplaySubject, Timestamp, zip} from "rxjs";
import {AdbRepository} from "./repositories/adb.repository";
import {Guid} from "guid-typescript";
import {catchError, first, flatMap, ignoreElements, map, tap, timeout, timestamp} from "rxjs/operators";
import {DeviceLog, DeviceLogType} from "../models/device";
import {FirebaseAuthService} from "./auth.service";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";

export class AgentService {
    public UUID: string;

    constructor(private adbRepo: AdbRepository,
                private authService: FirebaseAuthService,
                private firebaseRepo: FirebaseRepository) {
        const os = require('os');
        this.UUID = `pandalab-agent-desktop-${os.userInfo().uid}-${os.userInfo().username}`;
    }


    enroll(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
        const subject = new ReplaySubject();
        subject.next({log: 'Download and install service APK...', type: DeviceLogType.INFO});
        const enrollObs : Observable<DeviceLog> = this.adbRepo.installOnlineApk(adbDeviceId, "https://pandalab.page.link/qbvQ")
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
                    .pipe(map(() => result))), //TODO change url config
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


    getDeviceUID(deviceId: string): Observable<string> {
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

class AgentError extends Error {

    static APP_NOT_INSTALLED: string = "App is not installed on device";


    static notInstalled() {
        return new AgentError(AgentError.APP_NOT_INSTALLED)
    }

    private constructor(public message: string) {
        super(message);
    }

}
