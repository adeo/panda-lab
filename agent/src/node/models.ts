import * as firebase from 'firebase';
import DocumentReference = firebase.firestore.DocumentReference;

export interface FirebaseModel {
  _id: string;
  _path: string;
}

export interface Device extends FirebaseModel {
  ip: string;
  name: string;
  serialId: string;
  phoneModel: string;
  agentId: string;
  agent: DocumentReference;
}

export interface Job extends FirebaseModel {
  apkDebug: string;
  apkTest: string;
  apkRelease: string;
}

export interface JobTask extends FirebaseModel {
  device: Device;
  job: Job;
  status: string;
  ref: DocumentReference;
  finish: boolean;
}
