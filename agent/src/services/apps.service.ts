import {FirebaseRepository} from "./repositories/firebase.repository";
import * as winston from "winston";
import {filter, flatMap, map} from "rxjs/operators";
import {AppModel, AppVersion, Job, CollectionName} from "pandalab-commons";
import {Observable} from "rxjs";


export class AppsService {

    constructor(private logger: winston.Logger,
                private firebaseRepo: FirebaseRepository) {

    }


    // public listenLastVersion(applicationId: string): Observable<AppVersion> {
    //     const query = this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
    //         .doc(applicationId)
    //         .collection(CollectionName.VERSIONS)
    //         .orderBy('timestamp', "desc")
    //         .limit(1);
    //
    //     return this.firebaseRepo.listenQuery<AppVersion>(query)
    //         .pipe(
    //             filter(versions => versions.length > 0),
    //             map(versions => versions[0])
    //         )
    // }


    public listenLastAppTest(applicationId: string): Observable<{ job: Job, version: AppVersion }> {
        const query = this.firebaseRepo.getCollection(CollectionName.JOBS)
            .orderBy('createdAt', "desc")
            .where("app", "==", this.firebaseRepo.getCollection(CollectionName.APPLICATIONS).doc(applicationId))
            .where("completed", '==', true)
            .limit(1);

        return this.firebaseRepo.listenQuery<Job>(query)
            .pipe(
                filter(jobs => jobs.length > 0),
                map(jobs => jobs[0]),
                flatMap(job => {
                    return this.firebaseRepo.getDocument<AppVersion>(job.version as any)
                        .pipe(
                            map(version => {
                                return {
                                    job: job,
                                    version: version
                                };
                            })
                        )
                })
            )
    }

    public listenApps(): Observable<AppModel[]> {
        return this.firebaseRepo.listenCollection<AppModel>(CollectionName.APPLICATIONS)
    }

    public listenApp(applicationId: string): Observable<AppModel> {
        return this.firebaseRepo.listenDocument(CollectionName.APPLICATIONS, applicationId);
    }

    public listenAppVersions(applicationId: string): Observable<AppVersion[]> {
        return this.firebaseRepo.listenQuery<AppVersion>(this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .orderBy("versionCode", "desc")
        );
    }
}
