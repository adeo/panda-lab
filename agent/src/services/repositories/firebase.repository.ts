import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/firestore';
import '@firebase/messaging';
import '@firebase/storage';
import '@firebase/database';
import {firestore} from "firebase";
import {FirebaseNamespace} from '@firebase/app-types';
import {FullMetadata} from '@firebase/storage-types';
import {defer, from, Observable, of, throwError} from "rxjs";
import {CollectionName, FirebaseModel} from "pandalab-commons";
import {catchError, flatMap, map} from "rxjs/operators";
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
    apiURL: string,
    authProviders: string[],
}

export class FirebaseRepository {
    public firebase: FirebaseNamespace;

    constructor(config: FirebaseConfig) {
        firebase.initializeApp(config);
        this.firebase = firebase
    }

    getFileUrl(filePath: string): Observable<string> {
        return from(this.firebase.storage().ref("/" + filePath).getDownloadURL());
    }

    getFileMetadata(filePath: string): Observable<FullMetadata> {
        return from(this.firebase.storage().ref("/" + filePath).getMetadata());
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

    getDocumentFromId<T>(name: CollectionName, documentId: string): Observable<T> {
        return this.getDocument(this.getCollection(name).doc(documentId));
    }


    listenDocument<T>(name: CollectionName, documentId: string): Observable<T> {
        let documentReference = this.getCollection(name).doc(documentId);
        return this.listenDocumentRef(documentReference);
    }

    listenDocumentRef<T>(documentReference: DocumentReference): Observable<T> {
        return new Observable(emitter => {
            const subs = documentReference
                .onSnapshot(doc => {
                    emitter.next(this.toFirebaseModel<T>(doc));
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
                }, error => {
                    console.log('query error', error);
                    emitter.error(error)
                }, () => {
                    emitter.complete();
                });
            emitter.add(subs);
        });
    }

    saveDocument<T extends FirebaseModel>(doc: T, merge: boolean = true): Observable<T> {
        let ref: DocumentReference = doc._ref as any as DocumentReference;
        if (ref == null)
            return throwError("_ref not defined. can't save model");

        let savedObj = Object.assign({}, doc);
        delete savedObj['_ref'];
        return from(ref.set(savedObj, {merge: merge}))
            .pipe(
                flatMap(() => this.getDocument<T>(ref)),
                catchError(err => {
                    console.error(err);
                    return of(doc);
                }),
            ) as Observable<T>;
    }

    deleteDocument<T extends FirebaseModel>(doc: T): Observable<T> {
        let ref: DocumentReference = doc._ref as any as DocumentReference;
        if (ref == null)
            return throwError("_ref not defined. can't delete model");
        return defer(() => doc._ref.delete()).pipe(
            map(() => doc)
        );
    }


    private toFirebaseModel<T extends FirebaseModel>(doc: DocumentSnapshot): T {
        if (doc.exists) {
            return {
                ...doc.data(),
                _ref: doc.ref,
            } as FirebaseModel as T
        }
        return null;
    }
}

