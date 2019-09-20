import {FirebaseModel} from "./firebase.models";
import * as firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

export interface AppModel extends FirebaseModel{
    name: string
}


export interface AppVersion extends FirebaseModel{
    appName: string,
    flavor: string,
    package:string,
    timestamp: Timestamp,
    versionCode: number,
    versionName: string
}
