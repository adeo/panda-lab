import {FirebaseRepository} from "./repositories/firebase.repository";
import * as winston from "winston";
import {filter, flatMap, map} from "rxjs/operators";
import {AppModel, AppVersion, CollectionName, TestReport} from "pandalab-commons";
import {Observable} from "rxjs";


export class AppsService {

    constructor(private logger: winston.Logger,
                private firebaseRepo: FirebaseRepository) {
    }


    public listenLastAppTest(applicationId: string): Observable<{ jobReport: TestReport, version: AppVersion }> {
        const query = this.firebaseRepo.getCollection(CollectionName.JOB_REPORTS)
            .orderBy('date', "desc")
            .where("app", "==", this.firebaseRepo.getCollection(CollectionName.APPLICATIONS).doc(applicationId))
            .limit(1);

        return this.firebaseRepo.listenQuery<TestReport>(query)
            .pipe(
                filter(jobReports => jobReports.length > 0),
                map(jobReports => jobReports[0]),
                flatMap(jobReport => {
                    return this.firebaseRepo.getDocument<AppVersion>(jobReport.version as any)
                        .pipe(
                            map(version => {
                                return {
                                    jobReport: jobReport,
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

    public getApplication(applicationId: string): Observable<AppModel> {
        return this.firebaseRepo.getDocumentFromId(CollectionName.APPLICATIONS, applicationId);
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

    public getAppVersion(applicationId: string, versionId: string): Observable<AppVersion> {
        return this.firebaseRepo.getDocument(this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .doc(versionId));
    }


}
