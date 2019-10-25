import {FirebaseRepository} from "./repositories/firebase.repository";
import {AppModel, CollectionName, User, UserData} from "pandalab-commons";
import {from, Observable} from "rxjs";
import {FirebaseAuthService} from "./firebaseauth.service";
import {flatMap, toArray} from "rxjs/operators";
import {AppsService} from "./apps.service";

export class UserService {


    constructor(private firebaseRepo: FirebaseRepository,
                private authService: FirebaseAuthService,
                private appsService: AppsService) {
    }

    public getUsers(): Observable<User[]> {
        return this.firebaseRepo.getQuery<User>(this.firebaseRepo.getCollection(CollectionName.USER_SECURITY));
    }


    public listenHomeApps(): Observable<AppModel[]> {
        return this.firebaseRepo.listenDocument<UserData>(CollectionName.USERS, this.authService.auth.currentUser.uid)
            .pipe(
                flatMap(data => {
                        let apps = [];
                        if (data) {
                            apps = data.apps;
                        }
                        return from(apps)
                            .pipe(
                                flatMap(id => this.appsService.getApplication(id)),
                                toArray(),
                            )
                    }
                ))
    }

    public saveHomeApps(selectedApps: string[]): Observable<UserData> {
        return this.firebaseRepo.getDocumentFromId<UserData>(CollectionName.USERS, this.authService.auth.currentUser.uid)
            .pipe(flatMap(data => {
                if(data==null){
                    data = <UserData>{
                        _ref: this.firebaseRepo.getCollection(CollectionName.USERS).doc(this.authService.auth.currentUser.uid)
                    }
                }
                data.apps = selectedApps;
                return this.firebaseRepo.saveDocument(data)
            }))
    }
}
