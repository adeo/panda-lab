import {FirebaseRepository} from "./repositories/firebase.repository";
import {CollectionName} from "pandalab-commons";
import {User} from "pandalab-commons";
import {flatMap} from "rxjs/operators";
import {from} from "rxjs";

export class UserService {

    private firebaseRepo: FirebaseRepository;

    constructor(firebaseRepo: FirebaseRepository) {
        this.firebaseRepo = firebaseRepo;
    }

    public get users() {
        return this.firebaseRepo.getQuery<User>(this.firebaseRepo.getCollection(CollectionName.USER_SECURITY)).pipe(
            // flatMap(users => from<User[]>(users)),
            // flatMap(user => {
            //     this.firebaseRepo.firebase.auth().listUsers();
            // })
        );
    }


}
