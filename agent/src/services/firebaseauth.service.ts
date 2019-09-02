import {BehaviorSubject, from, Observable, zip} from "rxjs";
import {flatMap, tap} from "rxjs/operators";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/functions';
import {FirebaseAuth} from '@firebase/auth-types';
import {FirebaseFunctions} from '@firebase/functions-types';
import UserCredential = firebase.auth.UserCredential;

export class FirebaseAuthService {

    public auth: FirebaseAuth;
    private functions: FirebaseFunctions;
    private userBehaviour = new BehaviorSubject<UserLab>(null);

    constructor(private firebaseRepo: FirebaseRepository) {
        this.auth = this.firebaseRepo.firebase.auth();
        this.functions = this.firebaseRepo.firebase.functions();

        this.auth.onAuthStateChanged(user => {
            if (user) {
                console.log("firebase user logged", user.uid);
                user.getIdTokenResult().then(value => {
                    this.userBehaviour.next(
                        {
                            uuid: user.uid,
                            role: value.claims.role
                        }
                    )
                })
            } else {
                this.userBehaviour.next(null)
            }
        })
    }


    public get isConnected(): boolean {
        return this.auth ! == null && this.auth.currentUser !== null;
    }

    listenUser(): Observable<UserLab> {
        return this.userBehaviour
    }

    createDeviceToken(uid: string): Observable<string> {
        return new Observable((emitter) => {
            this.functions.httpsCallable('createMobileAgent')({
                uid: uid,
            })
                .then(result => {
                    console.log('createAgentToken result = ', result);
                    emitter.next(result.data.token);
                    emitter.complete();
                })
                .catch((error) => {
                    emitter.error(error);
                });
        });
    }

    signInWithAgentToken(agentToken: string, agentUUID: string): Observable<UserCredential> {
        return from(firebase.auth().signInWithCustomToken(agentToken)).pipe(
            tap(userCredentials => console.log('Firebase User credentials = ', JSON.stringify(userCredentials))),
            flatMap((userCredentials) => {
                return zip(firebase.auth().currentUser!.updateProfile({
                        displayName: agentUUID,
                    }), this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(agentUUID).set({
                        finalize: true,
                    }, {merge: true}), (v1, v2) => {
                        return userCredentials
                    }
                );
            }),
            tap(() => console.log('Firebase User credentials = ', JSON.stringify(firebase.auth().currentUser))),
        )
            ;
    }
}

export interface UserLab {
    role: string,
    uuid: string
}
