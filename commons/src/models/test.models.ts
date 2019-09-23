import * as firebase from "firebase";
import DocumentReference = firebase.firestore.DocumentReference;

// export interface Spoon {
//     title: string;
//     started: Date;
//     duration: number;
//     results: SpoonResult[];
// }


export enum TestStatus {
    pass = 'PASS',
    error = 'ERROR',
    fail = 'FAIL'
}


export interface TestModel {
    id: string;
    installFailed: boolean;
    device: DocumentReference;
    tests: TestResult[];
    started: Date;
    duration: number;
}


export interface TestResult {
    id: string;
    status: TestStatus;
    duration: number;
    screenshots: string[];
    logs: DocumentReference;
}

export interface LogsModel{
    logs : TestLog[]
}

export interface TestLog {
    level: string;
    tag: string;
    date: Date;
    message: string;
}

