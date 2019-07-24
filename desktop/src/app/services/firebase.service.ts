import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map, mergeMap, tap} from 'rxjs/operators';
import {ElectronService} from '../providers/electron.service';
import {Device, DeviceState} from '../@core/models/firebase';
import * as firebase from 'firebase';

firebase.initializeApp({
  apiKey: 'AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0',
  authDomain: 'panda-lab-lm.firebaseapp.com',
  projectId: 'panda-lab-lm',
  databaseURL: 'https://panda-lab-lm.firebaseio.com',
  messagingSenderId: '24857120470'
});

const FIRESTORE = firebase.firestore();
const FUNCTIONS = firebase.functions();

const CREATE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createAgent');
const CREATE_MOBILE_AGENT_FUNCTION = FUNCTIONS.httpsCallable('createMobileAgent');

const FIRESTORE_DEVICE_COLLECTION = 'devices';

@Injectable()
export class FirebaseService {

  private readonly uuid: string;

  constructor(private electronService: ElectronService) {
    const uuid = electronService.remote.require('./expose.ts').UUID;
    this.uuid = uuid.getUUID();
    console.log(`UUID = ${JSON.stringify(this.uuid)}`);
  }

  // region agent token

  public get agentToken(): string | null {
    return localStorage.getItem('agent_token');
  }

  public set agentToken(token: string) {
    localStorage.setItem('agent_token', token);
  }

  createAgentToken(): Observable<boolean> {
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
        await firebase.auth().currentUser.updateProfile({
          displayName: this.uuid,
        });
        await FIRESTORE.collection('agents').doc(this.uuid).set({
          finalize: true,
        }, {merge: true});
        return userCredentials;
      }),
      map(userCredentials => userCredentials !== null),
      tap(() => console.log('Firebase User credentials = ', JSON.stringify(firebase.auth().currentUser))),
    );
  }

  // endregion agent token

  checkDeviceState(deviceId: string): Observable<DeviceState> {
    return new Observable(emitter => {
      FIRESTORE.collection(FIRESTORE_DEVICE_COLLECTION).doc('device-' + deviceId).get()
        .then(doc => {
          if (doc.exists) {
            if (doc.data().currentServiceVersion === '1.0') {
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
    const idToken = from(firebase.auth().currentUser.getIdToken());
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

}
