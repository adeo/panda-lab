import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, from, Observable} from 'rxjs';
import {flatMap, map, toArray} from 'rxjs/internal/operators';
import {AdbStatus, AdbStatusState, DeviceAdb, LogcatMessage} from '../@core/models/adb';
import {ElectronService} from '../providers/electron.service';
import {FirebaseService} from './firebase.service';
import {GetDeviceIdentifierAction} from '../actions/get-device-identifier.action';

@Injectable()
export class AdbService {

  private adbClient: any;
  private Readable: any;
  private request: any;
  private readonly listDevices: BehaviorSubject<Array<DeviceAdb>>;
  private readonly adbStatus: BehaviorSubject<AdbStatus>;

  constructor(private electronService: ElectronService, private firebaseService: FirebaseService, public ngZone: NgZone,
              private getDeviceIdentifierAction: GetDeviceIdentifierAction) {
    const expose = electronService.remote.require('./expose.ts');
    this.adbClient = expose.adbClient;
    this.request = expose.request;
    this.Readable = expose.Readable;
    this.listDevices = new BehaviorSubject([]);
    this.adbStatus = new BehaviorSubject({state: AdbStatusState.STOPPED, time: Date.now()});

    this.startTrackingAdb();
  }

  private startTrackingAdb() {
    const adbService = this;

    // Get for the first time the list of connected devices
    this.adbClient.listDevicesWithPaths()
      .then(devices => {
        adbService.updateDevicesFlux(devices);
        adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
      })
      .catch(err => {
        console.error('Something went wrong:', err.stack);
        adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
      });

    // Listen adb actions
    this.adbClient.trackDevices()
      .then(tracker => {
        tracker.on('add', device => {
          console.log('Device %s was plugged in', device.id);
          const currentList = adbService.listDevices.value;

          if (!currentList.includes(device)) {
            currentList.push(device);
          }

          adbService.updateDevicesFlux(currentList);
          adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
        });
        tracker.on('remove', device => {
          console.log('Device %s was unplugged', device.id);
          let currentList = adbService.listDevices.value;
          currentList = currentList.filter(item => item.id !== device.id);

          adbService.updateDevicesFlux(currentList);
          adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
        });
        tracker.on('end', () => {
          console.log('Tracking stopped');
          adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
          setTimeout(() => {
            adbService.restartAdbTracking();
          }, 10000);
        });
      })
      .catch(err => {
        console.error('Something went wrong:', err.stack);
        adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
        setTimeout(() => {
          adbService.restartAdbTracking();
        }, 10000);
      });
  }

  private updateDevicesFlux(devices: DeviceAdb[]) {
    this.ngZone.runTask(args => {
      this.listDevices.next(devices);
    });
  }

  private updateAdbStatusFlux(state: AdbStatusState) {
    const adbStatus = {state, time: Date.now()};
    this.ngZone.runTask(args => {
      this.adbStatus.next(adbStatus);
    });
  }

  listenAdb(): Observable<Array<DeviceAdb>> {
    return this.listDevices.pipe(
      flatMap((devices: Array<DeviceAdb>) => {
          return from(devices).pipe(
            flatMap((device: DeviceAdb) => {
              return this.firebaseService.checkDeviceState(device.id).pipe(
                map(deviceState => {
                  device.deviceState = deviceState;
                  return device;
                })
              );
            }),
            toArray()
          );
        }
      )
    );
  }

  listenAdbStatus(): Observable<AdbStatus> {
    return this.adbStatus;
  }

  restartAdbTracking() {
    if (this.adbStatus.value.state === AdbStatusState.STOPPED) {
      this.updateAdbStatusFlux(AdbStatusState.LOADING);
      this.startTrackingAdb();
    }
  }

  readAdbLogcat(deviceId: string): Observable<string> {
    return new Observable(emitter => {
      this.adbClient.openLogcat(deviceId)
        .then(logcat => {
          logcat.on('entry', entry => {
            emitter.next(entry.message);
          });
        })
        .catch(err => {
          emitter.error(err);
        });
    });
  }

  installOnlineApk(deviceId: string, apkUrl: string): Observable<void> {
    return new Observable(emitter => {
      this.adbClient.install(deviceId, new this.Readable().wrap(this.request(apkUrl)))
        .then(() => {
          emitter.complete();
        })
        .catch(err => {
          emitter.error(err);
        });
    });
  }

  getDeviceId(adbDeviceId: string): Observable<string> {
    return from(this.getDeviceIdentifierAction.execute(adbDeviceId))
      .pipe(
        map((logcatMessage: LogcatMessage) => {
          const message = JSON.parse(logcatMessage.message);
          return message.device_id;
        })
      );
  }

  launchActivity(deviceId: string, activityName: string): Observable<void> {
    return new Observable(emitter => {
      this.adbClient.startActivity(deviceId, {component: activityName})
        .then(() => {
          emitter.complete();
        })
        .catch(err => {
          emitter.error(err);
        });
    });
  }

  launchActivityWithToken(deviceId: string, activityName: string, token: string, agentId: string): Observable<void> {
    return new Observable(emitter => {
      this.adbClient.startActivity(deviceId, {component: activityName, extras: {token, agentId }})
        .then(() => {
          emitter.complete();
        })
        .catch(err => {
          emitter.error(err);
        });
    });
  }

  enableTcpIp(deviceId: string): Observable<number> {
    return new Observable(emitter => {
      this.adbClient.tcpip(deviceId, 5555)
        .then(port => {
          emitter.next(port);
          emitter.complete();
        })
        .catch(err => {
          emitter.error(err);
        });
    });
  }

}
