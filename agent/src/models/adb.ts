
export interface DeviceAdb {
    id: string;
    serialId: string;
    model: string;
    type: string;
    path: string;
    agentInstalled: boolean;
}

export interface AdbStatus {
    state: AdbStatusState;
    time: number;
}

export enum AdbStatusState {
    STARTED = "listening",
    STOPPED = "stopped",
    LOADING = "loading"
}

// export interface LogcatMessage {
//     pid: number;
//     tid: number;
//     tag: string;
//     message: string;
// }
