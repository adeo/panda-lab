import * as firebase from "firebase";
import DocumentReference = firebase.firestore.DocumentReference;

export interface FirebaseModel {
    _ref?: DocumentReference;
}
