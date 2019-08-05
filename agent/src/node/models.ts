import * as firebase from 'firebase';
import DocumentReference = firebase.firestore.DocumentReference;
import DocumentData = firebase.firestore.DocumentData;

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
  application: DocumentReference;
}

export interface JobTask extends FirebaseModel {
  device: Device;
  job: Job;
  status: string;
  ref: DocumentReference;
  finish: boolean;
}
