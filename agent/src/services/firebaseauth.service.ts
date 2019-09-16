import {BehaviorSubject, from, Observable} from "rxjs";
import {filter, first, flatMap, map, tap} from "rxjs/operators";
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/functions';
import {FirebaseAuth} from '@firebase/auth-types';
import {FirebaseFunctions} from '@firebase/functions-types';
import {StoreRepository} from "./repositories/store.repository";
import UserCredential = firebase.auth.UserCredential;

export class FirebaseAuthService {

    private static AGENT_TOKEN_KEY = "agent_token";

    public auth: FirebaseAuth;
    private functions: FirebaseFunctions;
    private userBehaviour = new BehaviorSubject<UserLab>(null);

    constructor(private firebaseRepo: FirebaseRepository, private storeRepository: StoreRepository) {
        this.auth = this.firebaseRepo.firebase.auth();
        this.functions = this.firebaseRepo.firebase.functions();


        this.setup()

    }

    private async setup() {
        const refreshData = this.storeRepository.load(FirebaseAuthService.AGENT_TOKEN_KEY, null);
        if (refreshData) {
            try {
                console.info("try to restore session", refreshData);
                let oldToken = JSON.parse(refreshData);
                const result = await this.firebaseRepo.firebase.functions().httpsCallable("refreshCustomToken")(oldToken);
                console.log("refreshCustomToken result", result);
                const newToken = result.data.token;
                this.saveToken(newToken, oldToken.uid);
                const user = await this.auth.signInWithCustomToken(newToken);
                console.log("session restored", user.user.uid);

            } catch (e) {
                console.error("can't restore session", e)
            }

        }


        console.log('start listening');
        this.auth.onAuthStateChanged(user => {
            if (user) {
                console.log('firebase user logged');
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
                this.userBehaviour.next({role: null, uuid: null});
            }
        });
    }


    /**
     * This method check is a user is loaded in firebase auth and if a agent token is already generated
     */
    public async isConnected(): Promise<boolean> {
        return this.userBehaviour
            .pipe(
                filter(value => value != null),
                map(user => user.uuid != null),
                first(),
            ).toPromise()
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
                flatMap((userCredentials: UserCredential) => userCredentials.user.updateProfile({displayName: agentUUID})),
                flatMap(() => this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(agentUUID).update('finalize', true)),
                tap(() => {
                    console.log("save token");
                    this.saveToken(agentToken, agentUUID);
                }),
                flatMap(() => this.listenUser().pipe(filter(value1 => value1 != null && value1.uuid === agentUUID), first()))
            );
    }

    private saveToken(token: string, uid: string) {
        this.storeRepository.save(FirebaseAuthService.AGENT_TOKEN_KEY, JSON.stringify({
            token: token,
            uid: uid
        }))
    }
}

export interface UserLab {
    role: string,
    uuid: string,
}
