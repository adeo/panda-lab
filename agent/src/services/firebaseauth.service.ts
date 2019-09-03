import {BehaviorSubject, from, Observable} from "rxjs";
import {filter, first, flatMap, map, tap} from "rxjs/operators";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/functions';
import {FirebaseAuth} from '@firebase/auth-types';
import {FirebaseFunctions} from '@firebase/functions-types';
import {StoreRepository} from "./repositories/store.repository";

export class FirebaseAuthService {

    private static AGENT_TOKEN_KEY = "agent_token";

    public auth: FirebaseAuth;
    private functions: FirebaseFunctions;
    private userBehaviour = new BehaviorSubject<UserLab>(null);

    constructor(private firebaseRepo: FirebaseRepository, private storeRepository: StoreRepository) {
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
                    );
                })
            } else {
                console.log("firebase user is not logged");
                this.userBehaviour.next(null);
            }
        });
    }


    /**
     * This method check is a user is loaded in firebase auth and if a agent token is already generated
     */
    public async isConnected(): Promise<boolean> {
        return this.userBehaviour.getValue() !== null && this.hasAgentToken;
    }

    /**
     * Check if an agent token is stored
     */
    public get hasAgentToken(): boolean {
        return this.agentToken !== null;
    }

    /**
     * Get agent token. The default value is null
     */
    public get agentToken(): string | null {
        return this.storeRepository.load(FirebaseAuthService.AGENT_TOKEN_KEY, null);
    }

    /**
     * SignOut at FirebaseAuth and remove agent token in store
     */
    public async signOut() {
        await this.auth.signOut();
        this.storeRepository.save(FirebaseAuthService.AGENT_TOKEN_KEY, null);
    }

    listenUser(): Observable<UserLab> {
        return this.userBehaviour;
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

    signInWithAgentToken(agentToken: string, agentUUID: string): Observable<UserLab> {
        console.log("signInWithAgentToken : agent token = " + agentToken + " agent uuid = " + agentUUID);
        return from(firebase.auth().signInWithCustomToken(agentToken))
            .pipe(
                map(async (userCredentials) => {
                    try {
                        await firebase.auth().currentUser!.updateProfile({displayName: agentUUID});
                        await this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(agentUUID).set({finalize: true}, {merge: true});
                        return userCredentials;
                    } catch (e) {
                        console.error(e);
                        return userCredentials;
                    }
                }),
                tap(() => console.log('Firebase User credentials = ', JSON.stringify(firebase.auth().currentUser))),
                tap(() => this.storeRepository.save(FirebaseAuthService.AGENT_TOKEN_KEY, agentToken)),
                flatMap(() => this.listenUser().pipe(filter(value1 => value1 !== null), first())),
            );
    }
}

export interface UserLab {
    role: string,
    uuid: string,
}
