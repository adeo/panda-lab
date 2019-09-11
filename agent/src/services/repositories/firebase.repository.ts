import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/firestore';
import '@firebase/messaging';
import {firestore} from "firebase";
import {FirebaseNamespace} from '@firebase/app-types';
import {from, Observable, throwError} from "rxjs";
import {FirebaseModel} from "pandalab-commons";
import {flatMap, map} from "rxjs/operators";
import CollectionReference = firestore.CollectionReference;
import DocumentSnapshot = firestore.DocumentSnapshot;
import DocumentReference = firestore.DocumentReference;
import Query = firestore.Query;


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
    public firebase: FirebaseNamespace;

    constructor(config: FirebaseConfig) {
        firebase.initializeApp(config);
        this.firebase = firebase
    }


    getCollection(name: CollectionName): CollectionReference {
        return firebase.firestore().collection(name)
    }

    getDocument<T>(ref: DocumentReference): Observable<T> {
        return from(ref.get())
            .pipe(
                map(doc => this.toFirebaseModel<T>(doc))
            )
    }

    listenDocument<T>(name: CollectionName, documentId: string): Observable<T> {
        return new Observable(emitter => {
            const subs = this.getCollection(name).doc(documentId)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        emitter.next(this.toFirebaseModel<T>(doc));
                    } else {
                        emitter.next(null);
                    }
                }, emitter.error, emitter.complete);
            emitter.add(subs);
        });
    }

    listenCollection<T>(name: CollectionName): Observable<T[]> {
        return this.listenQuery(this.getCollection(name));
    }

    getQuery<T>(query: Query): Observable<T[]> {
        return from(query.get())
            .pipe(
                map(querySnapshot => querySnapshot.docs.map(doc => this.toFirebaseModel<T>(doc)))
            )
    }

    listenQuery<T>(query: Query): Observable<T[]> {
        return new Observable(emitter => {
            const subs = query
                .onSnapshot(doc => {
                    emitter.next(doc.docs.map(doc => this.toFirebaseModel<T>(doc)));
                }, emitter.error, emitter.complete);
            emitter.add(subs);
        });
    }

    saveDocument<T extends FirebaseModel>(doc: T, merge: boolean = true): Observable<T> {
        let ref = doc._ref;
        if (ref == null)
            return throwError("_ref not defined. can't save model")

        let savedObj = Object.assign({}, doc);
        delete savedObj['_ref'];
        return from(ref.set(savedObj, {merge: merge}))
            .pipe(flatMap(() => this.getDocument<T>(ref)))
    }



    private toFirebaseModel<T extends FirebaseModel>(doc: DocumentSnapshot): T {
        return {
            ...doc.data(),
            _ref: doc.ref,
        } as FirebaseModel as T
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
