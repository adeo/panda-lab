import {BehaviorSubject, from, Observable} from "rxjs";
import {flatMap, tap} from "rxjs/operators";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/functions';
import {FirebaseAuth} from '@firebase/auth-types';
import {FirebaseFunctions} from '@firebase/functions-types';
import UserCredential = firebase.auth.UserCredential;

export class FirebaseAuthService {

    private auth: FirebaseAuth;
    private functions: FirebaseFunctions;
    private userBehaviour = new BehaviorSubject<UserLab>(null);

    constructor(private firebaseRepo: FirebaseRepository) {
        this.auth = this.firebaseRepo.firebase.auth();
        this.functions = this.firebaseRepo.firebase.functions();

        this.auth.onAuthStateChanged(user => {
            if (user) {
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
        return this.auth.currentUser !== null;
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

    createAgentToken(uuid: string): Observable<UserCredential> {
        return new Observable<string>(emitter => {
            console.log('Create agent token with uid = ', uuid);
            this.functions.httpsCallable('createAgent')({
                uid: uuid,
            })
                .then((result) => {
                    emitter.next(result.data.token);
                    emitter.complete();
                })
                .catch(error => {
                    emitter.error(error);
                });
        }).pipe(
            tap(async () => {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }),
            tap(token => console.log(`Agent token created ${token}`)),
            //tap(token => this.agentToken = token),
            flatMap(token => from(firebase.auth().signInWithCustomToken(token))),
            tap(userCredentials => console.log('Firebase User credentials = ', JSON.stringify(userCredentials))),
            flatMap(async (userCredentials) => {
                await firebase.auth().currentUser!.updateProfile({
                    displayName: uuid,
                });
                await this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(uuid).set({
                    finalize: true,
                }, {merge: true});
                return userCredentials;
            }),
            tap(() => console.log('Firebase User credentials = ', JSON.stringify(firebase.auth().currentUser))),
        );
    }
}

export interface UserLab {
    role: string,
    uuid: string
}
