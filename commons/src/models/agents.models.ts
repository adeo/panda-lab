import {FirebaseModel} from "./firebase.models";
import {firestore} from "firebase";
import Timestamp = firestore.Timestamp;

export interface AgentModel extends FirebaseModel {
    name: string,
    createdAt: Timestamp,
    online: boolean
}
