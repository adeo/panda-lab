export interface DeviceLog {
    log: string;
    type: DeviceLogType;
}

export enum DeviceLogType {
    INFO = 'info',
    ERROR = 'error'
}
