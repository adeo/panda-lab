export interface DeviceLog {
  log: string;
  type: DeviceLogType;
}

export enum DeviceLogType {
  INFO,
  ERROR
}

export interface Device {
  _id: string;
  serialId: string;
  name: string;
  ip: string;
  phoneModel: string;
  phoneProduct: string;
  phoneDevice: string;
  phoneManufacturer: string;
  phoneBrand: string;
  phoneAndroidVersion: string;
  currentServiceVersion: string;
  lastConnexion: number;
  pictureIcon: string;
  processor: string;
}

export interface DeviceData {
  deviceFullName: string;
  deviceName: string;
  deviceCode: string;
  deviceBrand: string;
  devicePictureUrl: string;
  deviceProcessor: string;
  deviceOtherCode: string;
}


