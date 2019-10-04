import {FirebaseModel} from "./firebase.models";
import {firestore} from "firebase";
import Timestamp = firestore.Timestamp;

export enum Role {
    admin = "admin",
    guest = "guest",
    user = "user",
}

export interface User extends FirebaseModel {
    createdAt: Timestamp,
    role: Role,
    uid: string,
    email: string,
}