import {FirebaseModel} from "./firebase.models";
import {firestore} from "firebase";
import Timestamp = firestore.Timestamp;

export enum Role {
    guest = "guest",
    user = "user",
    mobile_agent = 'mobile-agent',
    admin = "admin",
    agent = "agent",
}

export interface User extends FirebaseModel {
    createdAt: Timestamp,
    role: Role,
    uid: string,
    email: string,
}

export interface UserData extends FirebaseModel {
    apps: string[]
}
