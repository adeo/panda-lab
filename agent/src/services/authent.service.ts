import {from, Observable} from "rxjs";
import * as firebase from 'firebase';
import {map, mergeMap, tap} from "rxjs/operators";
import {FUNCTIONS} from "@/services/firebase.service";
import {store, UUID} from "@/services/remote";
import {FIRESTORE} from "@/services/firebase.service";

const CREATE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createAgent');
const CREATE_MOBILE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createMobileAgent');

class AuthentService {

    private readonly uuid: string;

    constructor() {
        this.uuid = UUID;
        console.log(`UUID = ${JSON.stringify(this.uuid)}`);
    }

    public get agentToken(): string | null {
        return store.get('agent_token');
    }

    public set agentToken(token: string | null) {
        if (token === null) {
            store.delete('agent_token');
        } else {
            store.set('agent_token', token);
        }
    }

    public get isConnected(): boolean {
        return firebase.auth().currentUser !== null;
    }

    generateCustomJwtToken(uid: string): Observable<string> {
        const createMobileAgentObservable = (token): Observable<string> => {
            return new Observable((emitter) => {
                CREATE_MOBILE_AGENT_FUNCTION({
                    uid,
                    token,
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
        };
        const idToken = from(firebase.auth().currentUser!.getIdToken());
        return idToken.pipe(
            mergeMap(token => createMobileAgentObservable(token))
        );
    }

    createAgentToken(): Observable<string> {
        return new Observable<string>(emitter => {
            console.log('Create agent token with uid = ', this.uuid);
            CREATE_AGENT_FUNCTION({uid: this.uuid})
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
            tap(token => this.agentToken = token),
            mergeMap(token => from(firebase.auth().signInWithCustomToken(token))),
            tap(userCredentials => console.log('Firebase User credentials = ', JSON.stringify(userCredentials))),
            map(async (userCredentials) => {
                await firebase.auth().currentUser!.updateProfile({
                    displayName: this.uuid,
                });
                await FIRESTORE.collection('agents').doc(this.uuid).set({
                    finalize: true,
                }, {merge: true});
                return userCredentials;
            }),
            map(userCredentials => userCredentials !== null),
            tap(() => console.log('Firebase User credentials = ', JSON.stringify(firebase.auth().currentUser))),
            map(value => this.agentToken!),
        );
    }

}

export const authentService = new AuthentService();
