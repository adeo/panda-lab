import {Timestamp} from "rxjs";
import {ActionType, AgentDeviceData} from "../services/agent.service";

export interface DeviceLog {
    log: string;
    type: DeviceLogType;
}

export enum DeviceLogType {
    INFO,
    ERROR
}
