import {Artifact, CollectionName, Job, JobRequest, JobTask, TestReport} from 'pandalab-commons';
import {FirebaseRepository} from "./repositories/firebase.repository";
import '@firebase/auth';
import '@firebase/firestore';
import {from, Observable, of} from "rxjs";
import {filter, flatMap, map, tap, toArray} from "rxjs/operators";
import HttpsCallableResult = firebase.functions.HttpsCallableResult;


export class JobsService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    public getArtifacts(applicationId: string, versionId: string): Observable<Artifact[]> {
        const query = this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .doc(versionId)
            .collection(CollectionName.ARTIFACTS);

        return this.firebaseRepo.getQuery<Artifact>(query)
            .pipe(
                flatMap(from),
                filter((artifact: Artifact) => artifact.type !== 'test'),
                toArray(),
                tap((r) => console.log(`getArtifacts = ${r}`))
            );
    }

    public getArtifactsExcludeRelease(applicationId: string, versionId: string): Observable<Artifact[]> {
        return this.getArtifacts(applicationId, versionId).pipe(
            flatMap(from),
            filter((artifact: Artifact) => artifact.type !== 'release'),
            toArray(),
        );
    }

    public getJob(id: string): Observable<Job> {
        return this.firebaseRepo.getDocument<Job>(this.firebaseRepo.getCollection(CollectionName.JOBS).doc(id))
    }

    public getJobs(application: any, version: any): Observable<Job[]> {
        return this.getArtifacts(application, version)
            .pipe(
                flatMap(from),
                map((artifact: Artifact) => artifact._ref),
                flatMap(ref => {
                    return this.firebaseRepo.getQuery(this.firebaseRepo.getCollection(CollectionName.JOBS)
                        .where('apk', '==', ref))
                        .pipe(
                            flatMap(from)
                        )
                }),
                toArray()
            );
    }

    public getJobsTasks(jobId: string): Observable<JobTask[]> {
        const jobReference = this.firebaseRepo.getCollection(CollectionName.JOBS).doc(jobId);
        return this.firebaseRepo.getQuery<JobTask>(this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS)
            .where('job', '==', jobReference))
    }

    public getJobTask(taskId: string): Observable<JobTask> {
        return this.firebaseRepo.getDocument<JobTask>(this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS).doc(taskId))
    }


    public getDeviceJob(deviceUid: string): Observable<JobTask[]> {
        return this.firebaseRepo.getQuery<JobTask>(this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS)
            .where('device', '==', this.firebaseRepo.getCollection(CollectionName.DEVICES).doc(deviceUid)))
    }

    public getAllJobs(): Observable<Job[]> {
        return this.firebaseRepo.listenCollection(CollectionName.JOBS)
    }

    public createNewJob(artifact: Artifact): Observable<string> {
        return of(artifact)
            .pipe(
                flatMap(artifact => {
                    console.log(artifact.path);
                    const promise = this.firebaseRepo.firebase.functions().httpsCallable('createJob')(<JobRequest>{
                        artifact: artifact._ref.path,
                        devices: [],
                        groups: [],
                        devicesCount: 0,
                        timeoutInSecond: 60
                    });
                    return from(promise);
                }),
                map((result: HttpsCallableResult) => {
                    return result.data.jobId;
                }),
            );
    }

    listenAppReports(appId: string): Observable<TestReport[]> {
        return this.firebaseRepo.getQuery<TestReport>(this.firebaseRepo.getCollection(CollectionName.JOB_REPORTS)
            .orderBy("date", "asc")
            .where('app', '==', this.firebaseRepo.getCollection(CollectionName.APPLICATIONS).doc(appId)))
    }
}
