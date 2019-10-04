import {FirebaseRepository} from "./repositories/firebase.repository";
import {CollectionName, User} from "pandalab-commons";

export class UserService {

    private firebaseRepo: FirebaseRepository;

    constructor(firebaseRepo: FirebaseRepository) {
        this.firebaseRepo = firebaseRepo;
    }

    public get users() {
        return this.firebaseRepo.getQuery<User>(this.firebaseRepo.getCollection(CollectionName.USER_SECURITY));
    }


}
