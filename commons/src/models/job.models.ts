import {FirebaseModel} from "./firebase.models";
import {Spoon} from "./spoon.models";
import * as firebase from "firebase";
import DocumentReference = firebase.firestore.DocumentReference;
import Timestamp = firebase.firestore.Timestamp;

export enum JobStatus {
    pending = "pending",
    inprogress = "inprogress",
    unstable = "unstable",
    failure = "failure",
    success = "success"
}

export enum TaskStatus {
    pending = "pending",
    installing = "installing",
    running = "running",
    success = "success",
    error = "error"
}


export enum TestStatus {
    pass = 'PASS',
    error = 'ERROR',
    fail = 'FAIL'
}


export interface JobRequest {
    artifact: string;
    devices: string[]
    groups: string[]
    devicesCount: number,
    timeoutInSecond: number
}

export interface Job extends FirebaseModel {
    apk: DocumentReference,
    apk_test: DocumentReference,
    completed: boolean,
    status: JobStatus
}

export interface Artifact extends FirebaseModel {
    buildType: string;
    flavor: string;
    package: string;
    path: string;
    timestamp: any;
    type: any;
    versionCode: number;
    versionName: number;
}


export interface JobTask extends FirebaseModel {
    job: DocumentReference,
    device: DocumentReference,
    devices: string[],
    timeout: Timestamp,
    completed: boolean,
    status: TaskStatus,
    error: string,
    result: Spoon
}


