import {Timestamp} from 'rxjs';
import {DeviceLog} from './device';
import {DeviceState} from './firebase';

export interface DeviceAdb {
  id: string;
  type: string;
  path: string;
  deviceState: DeviceState;
  deviceLogs: Array<Timestamp<DeviceLog>>;
}

export interface AdbStatus {
  state: AdbStatusState;
  time: number;
}

export enum AdbStatusState {
  STARTED,
  STOPPED,
  LOADING
}

export interface LogcatMessage {
  pid: number;
  tid: number;
  tag: string;
  message: string;
}
