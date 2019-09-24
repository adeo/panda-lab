import {firestore} from "firebase";
import DocumentReference = firestore.DocumentReference;
import {FirebaseModel} from "./firebase.models";
import Timestamp = firestore.Timestamp;

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


export interface TestModel extends FirebaseModel{
    id: string;
    device: DocumentReference;
    tests: TestResult[];
    started: Timestamp;
    duration: number;
}


export interface TestResult {
    id: string;
    status: TestStatus;
    duration: number;
    screenshots: string[];
    logs: DocumentReference;
}

export interface LogsModel extends FirebaseModel{
    logs: TestLog[]
}

export interface TestLog {
    level: string;
    tag: string;
    date: Timestamp;
    message: string;
}


export interface TestReport extends FirebaseModel {
    date: Timestamp;
    app: DocumentReference;
    job: DocumentReference;
    devices: DocumentReference[];
    totalTests: number;
    testFailure: number;
    testUnstable: number;
    testSuccess: number;
}
