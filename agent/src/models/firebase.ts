export interface Device {
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
}

export enum DeviceState {
  UPDATED,
  ENROLL,
  NOT_ENROLL
}
