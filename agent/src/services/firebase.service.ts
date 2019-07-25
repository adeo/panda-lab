import {from, Observable} from 'rxjs';
import {flatMap, map, mergeMap, tap} from 'rxjs/operators';
import * as firebase from 'firebase';
import {Device, DeviceState} from "@/models/firebase";
import {UUID} from "@/services/remote";

firebase.initializeApp({
    apiKey: 'AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0',
    authDomain: 'panda-lab-lm.firebaseapp.com',
    projectId: 'panda-lab-lm',
    databaseURL: 'https://panda-lab-lm.firebaseio.com',
    messagingSenderId: '24857120470',
    storageBucket: "panda-lab-lm.appspot.com"

});

const FIRESTORE = firebase.firestore();
const FUNCTIONS = firebase.functions();
export const STORAGE = firebase.storage();

const CREATE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createAgent');
const CREATE_MOBILE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createMobileAgent');

const FIRESTORE_DEVICE_COLLECTION = 'devices';

export type UploadApplications = {
    [field: string]: any;
    appName: string;
    versionName: string;
};

export type UploadApplicationProgress = {
    file: File;
    percent: number;
};

class FirebaseService {

    private readonly uuid: string;

    constructor() {
        this.uuid = UUID;
        console.log(`UUID = ${JSON.stringify(this.uuid)}`);
    }

    // region agent token

    public get agentToken(): string | null {
        return localStorage.getItem('agent_token');
    }

    public set agentToken(token: string | null) {
        if (token === null) {
            localStorage.removeItem('agent_token');
        } else {
            localStorage.setItem('agent_token', token);
        }
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
            map(value => this.agentToken!)
        );
    }

    // endregion agent token

    checkDeviceState(deviceId: string): Observable<DeviceState> {
        return new Observable(emitter => {
            FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).doc('device-' + deviceId).get()
                .then(doc => {
                    if (doc.exists) {
                        if (doc.data()!.currentServiceVersion === '1.0') {
                            emitter.next(DeviceState.UPDATED);
                        } else {
                            emitter.next(DeviceState.ENROLL);
                        }
                        emitter.complete();
                    } else {
                        emitter.next(DeviceState.NOT_ENROLL);
                        emitter.complete();
                    }
                })
                .catch(error => {
                    emitter.error(error);
                });
        });
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

    listenSpecificDeviceFromFirestore(deviceId: string): Observable<Device> {
        return new Observable(emitter => {
            FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).doc(deviceId)
                .onSnapshot(doc => {
                    emitter.next(doc.data() as Device);
                });
        });
    }

    listenDevicesFromFirestore(): Observable<Device[]> {
        return new Observable(emitter => {
            FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).onSnapshot(function (snapshot) {
                const data = snapshot.docs.map(doc => doc.data());
                emitter.next(data);
            })
        });
    }

    uploadFiles(uuid: string, uploadApplications: UploadApplications): Observable<UploadApplicationProgress> {
        const { appName, versionName } = uploadApplications;
        const keys = Object.keys(uploadApplications)
            .filter(key => {
                return key !== 'appName' && key !== 'versionName';
            });

        return from(keys)
            .pipe(
                map(key => {
                    const file = uploadApplications[key];
                    console.log(key, file);
                    return {
                        file,
                        uploadTask: STORAGE.ref(`upload/${appName}/${appName}_${uuid}_${versionName}_${key}.apk`).put(file)
                    };
                }),
                flatMap(task => {
                    const {file, uploadTask} = task;
                    return new Observable<any>(subscriber => {
                        const subscribe = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
                        subscribe({
                            'next': (value) => {
                                const percent = Math.floor(value.bytesTransferred / value.totalBytes * 100);
                                subscriber.next(<UploadApplicationProgress> {
                                    file,
                                    percent,
                                });
                            },
                            'error': (err) => subscriber.error(err),
                            'complete': () => subscriber.complete()
                        });
                    });
                }),
            );
    }

}

export const firebaseService = new FirebaseService();
