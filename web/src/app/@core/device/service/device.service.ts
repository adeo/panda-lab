import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {from, Observable} from 'rxjs';
import {flatMap, map, toArray} from 'rxjs/operators';

declare var require: any;
const firebase = require('firebase');
require('firebase/firestore');

firebase.initializeApp({
  apiKey: ' AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0 ',
  authDomain: 'panda-lab-lm.firebaseapp.com',
  projectId: 'panda-lab-lm'
});

const db = firebase.firestore();

@Injectable()
export class DevicesService {

  constructor(private http: HttpClient) {

  }

  listenDevicesFromFirebase(): Observable<Device[]> {
    return new Observable<Device[]>(emitter => {
      db
        .collection('devices')
        .onSnapshot((snapshot) => {
          const data = snapshot.docs.map(doc => doc.data());
          emitter.next(data);
        });
    }).pipe(
      flatMap(devices =>
        from(devices)
          .pipe(
            flatMap((device: Device) => {
              return this.getDevicePicture()
                .pipe(
                  map((devicesData: DeviceData[]) => {
                    const deviceData = this.searchDeviceData(devicesData, device.phoneDevice, device.phoneModel);
                    if (deviceData != null) {
                      device.pictureIcon = deviceData.devicePictureUrl;
                      device.processor = deviceData.deviceProcessor;
                    }
                    console.log(device);
                    return device;
                  })
                );
            }),
            toArray()
          )
      )
    );
  }

  getDevicePicture(): Observable<DeviceData[]> {
    return this.http.get<DeviceData[]>('./assets/data/devices-data-complete.json');
  }

  searchDeviceData(devicesData: DeviceData[], phoneDevice: string, phoneModel: string): DeviceData | null {
    const data = devicesData.filter(
      (device) => {
        return device.deviceName === phoneDevice ||
          device.deviceCode === phoneDevice ||
          device.deviceOtherCode === phoneDevice ||
          device.deviceName === phoneModel ||
          device.deviceCode === phoneModel ||
          device.deviceOtherCode === phoneModel;
      }
    );

    if (data.length > 0) {
      return data[0];
    } else {
      return null;
    }
  }
}
