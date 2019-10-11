import {FirebaseModel} from "./firebase.models";
import {firestore} from "firebase";
import DocumentReference = firestore.DocumentReference;
import Timestamp = firestore.Timestamp;


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



export interface JobRequest {
    artifact: string;
    devices: string[]
    groups: string[]
    devicesCount: number,
    timeoutInSecond: number
}

export interface Job extends FirebaseModel {
    app: DocumentReference,
    version: DocumentReference,
    apk: DocumentReference,
    apk_test: DocumentReference,
    completed: boolean,
    status: JobStatus,
    createdAt: Timestamp;
}

export interface Artifact extends FirebaseModel {
    buildType: string;
    flavor: string;
    package: string;
    path: string;
    timestamp: Timestamp;
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
    createdAt: Timestamp,
}


