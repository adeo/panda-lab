import {FirebaseRepository} from "./repositories/firebase.repository";
import * as winston from "winston";


export class AppsService {

    constructor(private logger: winston.Logger,
                private firebaseRepo: FirebaseRepository) {

    }


}
