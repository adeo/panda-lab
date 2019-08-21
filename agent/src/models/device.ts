export interface DeviceLog {
    log: string;
    type: DeviceLogType;
}

export enum DeviceLogType {
    INFO,
    ERROR
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


