import {Injectable} from '@angular/core';
import {concat, Observable, of, Timestamp} from 'rxjs';
import {catchError, first, flatMap, ignoreElements, timeout, timestamp} from 'rxjs/internal/operators';
import {FirebaseService} from './firebase.service';
import {DeviceLog, DeviceLogType} from '../@core/models/device';
import {AdbService} from './adb.service';
import {ElectronService} from '../providers/electron.service';

@Injectable()
export class DeviceService {

  private readonly uuid: string;

  constructor(private adbService: AdbService, private firebaseService: FirebaseService, private electronService: ElectronService) {
    this.uuid = electronService.remote.require('./expose.ts').uuid;
  }

  // TODO: Use url and package from config and use agentUID
  enroll(adbDeviceId: string): Observable<Timestamp<DeviceLog>> {
    return this.adbService.getDeviceId(adbDeviceId)
      .pipe(
        flatMap(deviceId => {
          return concat(
            of({log: `Generate firebase token...`, type: DeviceLogType.INFO}),
            this.firebaseService.generateCustomJwtToken(`${deviceId}`)
              .pipe(
                flatMap(deviceToken => concat(
                  of({log: `Firebase token generate with success with token ${deviceToken}`, type: DeviceLogType.INFO}),
                  of({log: 'Download and install service APK...', type: DeviceLogType.INFO}),
                  // this.adbService.installOnlineApk(adbDeviceId, process.env.APK_URL),
                  of({log: 'Installation complete with success', type: DeviceLogType.INFO}),
                  of({log: 'Launch of the service...', type: DeviceLogType.INFO}),
                  this.adbService.launchActivityWithToken(adbDeviceId, 'com.leroymerlin.pandalab/.home.HomeActivity',
                    deviceToken, this.uuid),
                  of({log: 'Launching success', type: DeviceLogType.INFO}),
                  of({log: 'Wait for the device in database...', type: DeviceLogType.INFO}),
                  this.firebaseService.listenSpecificDeviceFromFirestore(deviceId)
                    .pipe(
                      first(device => device != null),
                      ignoreElements()
                    ),
                  of({log: `Device enroll with success !`, type: DeviceLogType.INFO})
                )),
                timeout<DeviceLog>(50000),
                catchError(error => of({log: 'Error: ' + error, type: DeviceLogType.ERROR}))
              )
          ).pipe(
            timestamp()
          );
        }),
      );
  }
}
