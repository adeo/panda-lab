import * as firebase from "firebase";
import DocumentReference = firebase.firestore.DocumentReference;

export interface FirebaseModel {
    _ref?: DocumentReference;
}


export enum CollectionName {
    JOBS_TASKS = "jobs-tasks",
    JOBS = "jobs",
    ARTIFACTS = "artifacts",
    VERSIONS = "versions",
    APPLICATIONS = "applications",
    DEVICES = "devices",
    DEVICE_GROUPS = "deviceGroups",
    AGENTS = "agents",
    TASK_REPORTS = "task-reports",
    LOGS = "logs",
    JOB_REPORTS = 'job-reports',
}
