import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {from, Observable, Subscription, Timestamp} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import {AdbStatus, AdbStatusState, DeviceAdb} from '../../../@core/models/adb';
import {DeviceState} from '../../../@core/models/firebase';
import {DeviceLog, DeviceLogType} from '../../../@core/models/device';
import {AdbService} from '../../../services/adb.service';
import {DeviceService} from '../../../services/device.service';
import {ElectronUtils} from '../../../utils/electron.utils';

@Component({
  selector: 'app-pages-listdevice',
  template: `
    <div class="devices-container">
      <div class="devices-list-container mat-elevation-z4">
        <h2 class="mat-h2">List of connected devices:</h2>
        <mat-list>
          <mat-list-item *ngFor="let device of devices$ | async">
            <mat-icon mat-list-icon>phone_android</mat-icon>
            <h4 mat-line><b>{{ device.id }}</b></h4>
            <p mat-line>{{ device.type }} / {{ device.path }}</p>
            <p mat-line>
              <b>
                {{ (device.deviceState === deviceState.UPDATED || device.deviceState === deviceState.ENROLL)
                ? 'Already enroll' : 'Never enroll'}}
              </b>
            </p>
            <p mat-line
               matTooltip="{{ showDeviceLogs(device) }}"
               [ngStyle]="{'color': (device.deviceLogs != null
               && getLastLog(device).value.type === deviceLogType.ERROR)? '#D2413A' : '#4caf50'}">
              {{ (device.deviceLogs != null) ? getLastLog(device).value.log : ' ' }}</p>
            <div class="devices-button-container">
              <mat-spinner class="devices-loader" *ngIf="getDeviceStatus(device.id)" [diameter]="25"></mat-spinner>
              <button class="devices-button" *ngIf="!(device.deviceState === deviceState.UPDATED)"
                      [disabled]="getDeviceStatus(device.id)" mat-raised-button color="primary"
                      (click)="enroll(device)">{{ (device.deviceState === deviceState.ENROLL) ? 'Update' : 'Enroll' }}
              </button>
              <div class="devices-status" [ngStyle]="{'background-color': (device.deviceState === deviceState.UPDATED
              || device.deviceState === deviceState.ENROLL)? '#4caf50' : '#D2413A'}"></div>
            </div>
          </mat-list-item>
        </mat-list>
      </div>
      <div class="devices-infos-container mat-elevation-z4">
        <h2 class="mat-h2">Infos status:</h2>
        <h3 class="mat-h3">Number of connected devices:</h3>
        <h2 class="mat-h2"><b>{{ devicesCount }}</b></h2>
        <h3 class="mat-h3">ADB Status:</h3>
        <h2 class="devices-adb-status-listen mat-h2" *ngIf="(adbStatus$ | async)?.state === adbStateEnum.STARTED"><b>Listening</b>
        </h2>
        <div class="devices-adb-status-stop-container"
             *ngIf="(adbStatus$ | async)?.state === adbStateEnum.STOPPED || (adbStatus$ | async)?.state === adbStateEnum.LOADING">
          <h2 class="devices-adb-status-stop mat-h2"><b>Stopped</b></h2>
          <button class="devices-restart-adb" [disabled]="(adbStatus$ | async)?.state === adbStateEnum.LOADING"
                  mat-raised-button color="primary"
                  (click)="restartAdbTracking()">Restart
          </button>
          <mat-spinner class="devices-restart-adb-loader"
                       *ngIf="(adbStatus$ | async)?.state === adbStateEnum.LOADING" [diameter]="25"></mat-spinner>
        </div>
      </div>
      <div class="devices-settings-container mat-elevation-z4">
        <h2 class="mat-h2">Settings:</h2>
        <mat-list>
          <mat-list-item>
            <mat-slide-toggle color="primary" (change)="autoEnroll($event.checked)" [checked]="getAutoEnrollButtonState()">Auto enrollment
            </mat-slide-toggle>
          </mat-list-item>
          <mat-list-item>
            <mat-slide-toggle color="primary" (change)="enableTcpIp($event.checked)" [checked]="getEnableTcpIpButtonState()">Enable TCP/IP
            </mat-slide-toggle>
          </mat-list-item>
        </mat-list>
      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .mat-tooltip {
      white-space: pre-line
    }

    .devices-container {
      position: relative;
      overflow: auto;
      padding: 10px;
      margin: 10px;
    }

    .devices-list-container {
      width: 400px;
      background-color: #fff;
      padding: 10px 15px 10px 15px;
      border-radius: 5px;
      margin: 10px;
      float: left;
    }

    .devices-infos-container {
      width: 400px;
      background-color: #fff;
      padding: 10px 10px 10px 20px;
      border-radius: 5px;
      margin: 10px;
      float: left;
    }

    .devices-settings-container {
      width: 400px;
      background-color: #fff;
      padding: 10px 10px 10px 20px;
      border-radius: 5px;
      margin: 10px;
      float: left;
    }

    .devices-loader {
      margin-right: 15px;
    }

    .devices-button-container {
      display: flex;
      align-items: center;
    }

    .devices-adb-status-listen {
      color: #4caf50;
    }

    .devices-adb-status-stop {
      color: #D2413A;
      margin-right: 15px;
    }

    .devices-restart-adb {
      margin-right: 15px;
    }

    .devices-adb-status-stop-container {
      display: flex;
      align-items: center;
    }

    .devices-status {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin-left: 10px;
    }
  `]
})
export class ListDeviceComponent implements OnInit, OnDestroy {
  constructor(private adbService: AdbService, private deviceService: DeviceService,
              private electronUils: ElectronUtils, public ngZone: NgZone) {
  }

  static AUTO_ENROLL_KEY = 'autoEnroll';
  static ENABLE_TCP_IP = 'enableTcpIp';

  devices$: Observable<Array<DeviceAdb>>;
  adbStatus$: Observable<AdbStatus>;
  devicesTcpIp: Subscription;
  devicesAutoEnroll: Subscription;

  devicesCount: number;
  devicesStatus = new Map<string, DeviceAdb>();
  adbStateEnum: typeof AdbStatusState = AdbStatusState;
  deviceState: typeof DeviceState = DeviceState;
  deviceLogType: typeof DeviceLogType = DeviceLogType;

  ngOnInit() {
    this.devices$ = this.adbService.listenAdb().pipe(
      map(devices => {
        this.devicesCount = devices.length;
        return devices;
      })
    );

    this.adbStatus$ = this.adbService.listenAdbStatus();
  }

  ngOnDestroy() {
    if (this.devicesAutoEnroll != null) {
      this.devicesAutoEnroll.unsubscribe();
    }

    if (this.devicesTcpIp != null) {
      this.devicesTcpIp.unsubscribe();
    }
  }

  enroll(device: DeviceAdb) {
    device.deviceLogs = [];
    this.addDeviceStatus(device);
    this.deviceService.enroll(device.id)
      .subscribe((deviceLog) => {
          console.log(deviceLog);
          device.deviceLogs.push(deviceLog);
        },
        (error) => {
          console.error('Enrollment error', error);
          this.removeDeviceStatus(device);
        },
        () => {
          console.log('Enrollment complete');
          device.deviceState = DeviceState.UPDATED;
          this.removeDeviceStatus(device);
        }
      );
  }

  getDeviceStatus(deviceId: string): boolean {
    if (this.devicesStatus.get(deviceId) != null) {
      return true;
    }
    return false;
  }

  addDeviceStatus(device: DeviceAdb) {
    this.ngZone.runTask(args => {
      this.devicesStatus.set(device.id, device);
    });
  }

  removeDeviceStatus(device: DeviceAdb) {
    this.ngZone.runTask(args => {
      this.devicesStatus.delete(device.id);
    });
  }

  restartAdbTracking() {
    this.adbService.restartAdbTracking();
  }

  autoEnroll(enable: boolean) {
    if (enable) {
      this.electronUils.storeSet(ListDeviceComponent.AUTO_ENROLL_KEY, true);
      this.devicesAutoEnroll = this.adbService.listenAdb().pipe(
        flatMap(devices => {
          return from(devices).pipe(
            map(device => {
              if (device.deviceState !== DeviceState.UPDATED) {
                this.enroll(device);
              }
              return device;
            })
          );
        })
      ).subscribe((device) => {
          console.log(device);
        },
        (error) => {
          console.error('Error auto-enroll', error);
        },
        () => {
          console.log('Auto-enroll complete');
        }
      );
    } else {
      this.electronUils.storeSet(ListDeviceComponent.AUTO_ENROLL_KEY, false);

      if (this.devicesAutoEnroll != null) {
        this.devicesAutoEnroll.unsubscribe();
      }
    }
  }

  enableTcpIp(enable: boolean) {
    if (enable) {
      this.electronUils.storeSet(ListDeviceComponent.ENABLE_TCP_IP, true);
      this.devicesTcpIp = this.adbService.listenAdb().pipe(
        flatMap(devices => {
          return from(devices).pipe(
            flatMap(device => {
              return this.adbService.enableTcpIp(device.id);
            })
          );
        })
      ).subscribe((port) => {
          console.log(port);
        },
        (error) => {
          console.error('Error enable TCP/IP', error);
        },
        () => {
          console.log('Enable TCP/IP complete');
        }
      );
    } else {
      this.electronUils.storeSet(ListDeviceComponent.ENABLE_TCP_IP, false);

      if (this.devicesTcpIp != null) {
        this.devicesTcpIp.unsubscribe();
      }
    }
  }

  getLastLog(device: DeviceAdb): Timestamp<DeviceLog> {
    return device.deviceLogs[device.deviceLogs.length - 1];
  }

  showDeviceLogs(device: DeviceAdb): string {
    const instance = this;
    if (device.deviceLogs != null) {
      let deviceLogs = '';
      device.deviceLogs.forEach(function (logs) {
        deviceLogs = deviceLogs + '[' + instance.getDateFromTimestamp(logs.timestamp) + ']: ' + logs.value.log + '\n';
      });
      return deviceLogs;
    } else {
      return '';
    }
  }

  getDateFromTimestamp(timestamp: number): string {
    const d = new Date(timestamp);

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();

    return `${hours <= 9 ? '0' + hours : hours}:${minutes <= 9 ? '0' + minutes : minutes}:${seconds <= 9 ? '0' + seconds : seconds}`;
  }

  getAutoEnrollButtonState(): boolean {
    if (this.devicesAutoEnroll == null) {
      this.autoEnroll(this.electronUils.storeGet(ListDeviceComponent.AUTO_ENROLL_KEY));
    }
    return this.electronUils.storeGet(ListDeviceComponent.AUTO_ENROLL_KEY);
  }

  getEnableTcpIpButtonState(): boolean {
    if (this.devicesTcpIp == null) {
      this.enableTcpIp(this.electronUils.storeGet(ListDeviceComponent.ENABLE_TCP_IP));
    }
    return this.electronUils.storeGet(ListDeviceComponent.ENABLE_TCP_IP);
  }
}
