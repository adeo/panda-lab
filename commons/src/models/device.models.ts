import {FirebaseModel} from "./firebase.models";
import {firestore} from "firebase";
import DocumentReference = firestore.DocumentReference;

export interface Device extends FirebaseModel {
    agent: DocumentReference;
    status: DeviceStatus;
    serialId: string;
    name: string;
    ip: string;
    phoneModel: string;
    phoneProduct: string;
    phoneDevice: string;
    phoneManufacturer: string;
    phoneBrand: string;
    phoneAndroidVersion: string;
    currentServiceVersion: string;
    lastConnexion: number;
    lastTcpActivation: number;
    pictureIcon: string;
    processor: string;
}

export enum DeviceStatus {
    offline = "offline",
    available = "available",
    working = "working",
    booked = "booked",
}
