import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import UserCredential = firebase.auth.UserCredential;
import Persistence = firebase.auth.Auth.Persistence;

/**
 * Enable all authentication methods on Firebase Authentication
 */
@Injectable()
export class AuthService {

  /**
   * Find out if the user is connected to Firebase
   * The firebase.auth.currentUser property is not initialized
   * at startup so you must wait for it to be instantiated.
   */
  public async isConnected(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        firebase.auth().onAuthStateChanged(authUser => {
          resolve(authUser !== null);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Connect to Firebase Authentification with login / password
   * @param email - Email from your organization
   * @param password - Password not empty
   */
  public async signIn(email: string, password: string): Promise<void> {
    await firebase.auth().setPersistence(Persistence.SESSION);
    const userCredential: UserCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log('signIn = ', JSON.stringify(userCredential));
  }

  /**
   * Create a user to Firebase Authentification with login / password
   * @param email - Email from your organization
   * @param password - Password not empty
   */
  public async signUp(email: string, password: string): Promise<void> {
    await firebase.auth().setPersistence(Persistence.SESSION);
    const userCredential: UserCredential = await firebase.auth().createUserAndRetrieveDataWithEmailAndPassword(email, password);
    console.log('signUp = ', JSON.stringify(userCredential));
  }

  /**
   * Disconnected the Firebase user
   */
  public signOut(): Promise<void> {
    return firebase.auth().signOut();
  }
}
