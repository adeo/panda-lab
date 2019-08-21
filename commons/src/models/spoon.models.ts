export interface Spoon {
    title: string;
    started: Date;
    duration: number;
    results: SpoonResult[];
}

export interface SpoonResult {
    id: string;
    installFailed: boolean;
    device: SpoonDevice;
    tests: SpoonTest[];
    started: Date;
    duration: number;
    exception: any[];
}

export interface SpoonDevice {
    model: string;
    manufacturer: string;
    version: string;
    apiLevel: number;
    isEmulator: boolean;
}

export interface SpoonTest {
    className: string;
    methodName: string;
    status: string;
    duration: number;
    screenshots: any[];
    files: any[];
    logs: SpoonTestLog[];
}

export interface SpoonTestLog {
    level: string;
    pid: number;
    tid: number;
    appName: string;
    tag: string;
    date: Date;
    message: string;
}

