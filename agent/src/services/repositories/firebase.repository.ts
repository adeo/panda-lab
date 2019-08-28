import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/firestore';
import {firestore} from "firebase";
import {FirebaseNamespace} from '@firebase/app-types';
import {Observable} from "rxjs";
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
    firebase: FirebaseNamespace;

    constructor(config: FirebaseConfig) {
        firebase.initializeApp(config);
        this.firebase = firebase

    }


    getCollection(name: CollectionName): CollectionReference {
        return firebase.firestore().collection(name)
    }

    listenDocument<T>(name: CollectionName, documentId: string): Observable<T> {
        return new Observable(emitter => {
            const subs = this.getCollection(name).doc(documentId)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        emitter.next(doc.data() as T);
                    } else {
                        emitter.next(null);
                    }
                }, emitter.error, emitter.complete);
            emitter.add(subs);
        });
    }

    listenCollection<T>(name: CollectionName): Observable<T[]> {
        return new Observable(emitter => {
            const subs = this.getCollection(name)
                .onSnapshot(doc => {
                    emitter.next(doc.docs.map(value => value.data() as T));
                }, emitter.error, emitter.complete);
            emitter.add(subs);
        });
    }


}


export enum CollectionName {
    JOBS_TASKS = "jobs-tasks",
    JOBS = "jobs",
    ARTIFACTS = "artifacts",
    VERSIONS = "versions",
    APPLICATIONS = "applications",
    DEVICES = "devices",
    AGENTS = "agents",
}
