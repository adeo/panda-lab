import {BehaviorSubject, from, Observable} from "rxjs";
import {filter, first, flatMap, map, tap} from "rxjs/operators";
import {FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/functions';
import {FirebaseAuth} from '@firebase/auth-types';
import {FirebaseFunctions} from '@firebase/functions-types';
import {StoreRepository} from "./repositories/store.repository";
import UserCredential = firebase.auth.UserCredential;
import winston from "winston";

export class FirebaseAuthService {

    private static AGENT_TOKEN_KEY = "agent_token";

    public auth: FirebaseAuth;
    private functions: FirebaseFunctions;
    private userBehaviour = new BehaviorSubject<UserLab>(null);

    constructor(private logger: winston.Logger,private firebaseRepo: FirebaseRepository, private storeRepository: StoreRepository) {
        this.auth = this.firebaseRepo.firebase.auth();
        this.functions = this.firebaseRepo.firebase.functions();
        this.setup()
    }

    private async setup() {
        const refreshData = this.storeRepository.load(FirebaseAuthService.AGENT_TOKEN_KEY, null);
        if (refreshData) {
            try {
                this.logger.info("try to restore session");
                let oldToken = JSON.parse(refreshData);
                const result = await this.firebaseRepo.firebase.functions().httpsCallable("refreshCustomToken")(oldToken);
                const newToken = result.data.token;
                this.saveToken(newToken, oldToken.uid);
                const user = await this.auth.signInWithCustomToken(newToken);
                this.logger.info("session restored");

            } catch (e) {
                this.logger.error("can't restore session", e)
            }

        }


        this.logger.verbose('start listening');
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.logger.verbose('firebase user logged');
                user.getIdTokenResult().then(value => {
                    this.userBehaviour.next(
                        {
                            uuid: user.uid,
                            role: value.claims.role
                        }
                    );
                })
            } else {
                this.logger.verbose("firebase user is not logged");
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
                    emitter.next(result.data.token);
                    emitter.complete();
                })
                .catch((error) => {
                    emitter.error(error);
                });
        });
    }

    signInWithAgentToken(agentToken: string, agentUUID: string): Observable<UserLab> {
        return from(this.firebaseRepo.firebase.auth().signInWithCustomToken(agentToken))
            .pipe(
                flatMap((userCredentials: UserCredential) => userCredentials.user.updateProfile({displayName: agentUUID})),
                tap(() => {
                    this.logger.verbose("save agent token");
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

    async logout() {
        return this.firebaseRepo.firebase.auth().signOut()
    }
}

export interface UserLab {
    role: string,
    uuid: string,
}
