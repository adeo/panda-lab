import {FirebaseModel} from "./firebase.models";

export interface Device extends FirebaseModel {
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
    pictureIcon: string;
    processor: string;
}

export enum DeviceState {
    UPDATED,
    ENROLL,
    NOT_ENROLL
}


export enum DeviceStatus {
    offline = "offline",
    available = "available",
    working = "working",
    booked = "booked",
}
