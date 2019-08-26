import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/firestore';
import {firestore} from "firebase";
import CollectionReference = firestore.CollectionReference;


export interface FirebaseConfig {
    apiKey: string,
    authDomain: string,
    projectId: string,
    databaseURL: string,
    messagingSenderId: string,
    storageBucket: string,
    apiURL: string
}

export class FirebaseRepository {

    constructor(config: FirebaseConfig) {
        firebase.initializeApp(config);


    }


    getCollection(name: CollectionName): CollectionReference {
        return firebase.firestore().collection(name)
    }


}


export enum CollectionName {
    DEVICES = "devices",
}
