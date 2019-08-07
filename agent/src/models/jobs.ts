import {Device} from "@/models/device";

export interface FirebaseModel {
    _id: string;
    _path: string;
}

export interface Job extends FirebaseModel{
    apk: Artifact;
    apkTest: Artifact;
    completed: boolean;
    status: string;
    totalTasks: number | null;
}

export interface Artifact extends FirebaseModel{
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
    device: Device;
    job: Job;
    status: string;
}
