import {from, Observable, of} from 'rxjs';
import {flatMap, map, mergeMap, tap} from 'rxjs/operators';
import * as firebase from 'firebase';
import {Device, DeviceState} from "pandalab-commons";
import {store, UUID} from "@/services/remote";
import {adbService} from "@/services/agent.service";
import "rxjs-compat/add/operator/onErrorResumeNext";
import {AxiosInstance} from "axios";
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import * as _firestore from '@google-cloud/firestore';
import DocumentReference = FirebaseFirestore.DocumentReference;
import Timestamp = FirebaseFirestore.Timestamp;
import "rxjs-compat/add/operator/timeout";
const axios: AxiosInstance = require('axios');

firebase.initializeApp({
    apiKey: 'AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0',
    authDomain: 'panda-lab-lm.firebaseapp.com',
    projectId: 'panda-lab-lm',
    databaseURL: 'https://panda-lab-lm.firebaseio.com',
    messagingSenderId: '24857120470',
    storageBucket: "panda-lab-lm.appspot.com",
});

export const API_URL = 'https://us-central1-panda-lab-lm.cloudfunctions.net';
export const API_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'X-API-KEY': 'ec6ba3c4-d0f6-4243-a5ed-d598468dbf31',
    'Content-Type': 'application/json',
};

export const FIRESTORE = firebase.firestore();
export const FUNCTIONS = firebase.functions();
export const STORAGE = firebase.storage();

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

    constructor() {

    }

    checkDeviceState(deviceId: string): Observable<DeviceState> {
        console.log(`checkDeviceState : ${deviceId}`);

        const findDeviceInFirestore = (uuid) => {
            return new Observable<DeviceState>(emitter => {
                FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).doc(uuid).get()
                    .then(doc => {
                        if (doc.exists) {
                            const isSameVersion = doc.data()!.currentServiceVersion === '1.0';
                            if (isSameVersion) {
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
        };

        return adbService.getDeviceId(deviceId)
            .timeout(5000)
            .flatMap(findDeviceInFirestore)
            .onErrorResumeNext(of(DeviceState.NOT_ENROLL));

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
        return new Observable<Device[]>(emitter => {
            FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).onSnapshot(function (snapshot) {
                const data = snapshot.docs.map(doc => doc.data());
                emitter.next(data as Device[]);
            })
        });
    }

    uploadFiles(uuid: string, uploadApplications: UploadApplications): Observable<UploadApplicationProgress> {
        const {appName, versionName} = uploadApplications;
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
                                subscriber.next(<UploadApplicationProgress>{
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

    registerJobsTaks(callback: (snapshot: QuerySnapshot) => void): () => void {
        return FIRESTORE.collection('jobs-tasks')
            .where('status', '==', 'pending')
            .onSnapshot(callback);
    }

    /**
     * Create a job
     * @param artifact - firebase reference path ( ex: /applications/passport/versions/YOUR_VERSION/artifacts/YOUR_ARTIFACT
     * @param devices - Ids of devices ( ex: [ ID_1, ID_2 ] )
     * @param groups - Groups of devices ( ex: [ ID_GROUP_1, ID_GROUP_2 ] )
     */
    async createJob(artifact: string, devices: string[], groups: string[]) {
        try {
            const response = await axios.post(`${API_URL}/api/createJob`, {
                artifact,
                devices,
                groups
            }, {headers: API_HEADERS});
            const data = response.data;
            console.log(`Create job : ${data.jobId}`);
        } catch (e) {
            console.error(e);
        }
    }

}

export const firebaseService = new FirebaseService();
