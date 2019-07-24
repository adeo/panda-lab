import {Component, OnInit} from '@angular/core';
import {DevicesService} from "../../@core/device/service/device.service";
import {Observable} from "rxjs/index";

@Component({
  selector: 'console-listdevice',
  template: `
    <!--<div class="device-header">-->
      <!--<h2 class="mat-h2"><b>List of devices:</b></h2>-->
    <!--</div>-->
    <div class="devices-card-container">
      <div *ngFor="let device of devices$ | async" class="devices-grid">
        <mat-card class="devices-card">

          <mat-card-header>
            <mat-card-title class="md-card-title">{{ device.phoneModel }}</mat-card-title>
          </mat-card-header>

          <img mat-card-image [src]="(device.pictureIcon || 'assets/images/device.png')">

          <mat-card-content>
            <div class="card-text-content">
              {{ device.name }}
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`    
    
    .devices-card-container {
      margin: 15px;
      position: relative;
      overflow: auto;
    }
    
    .devices-card {
      width: 300px;
      float: left;
      margin: 5px;
    }
    
    .device-header {
      margin: 15px;
      color: #fff
    }
  `]
})
export class ListDeviceComponent implements OnInit {

  devices$: Observable<Array<Device>>;

  constructor(private deviceService: DevicesService) {

  }

  ngOnInit() {
    this.devices$ = this.deviceService.listenDevicesFromFirebase()
  }
}
