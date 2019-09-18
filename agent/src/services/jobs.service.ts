import {Artifact, Job, JobTask} from 'pandalab-commons';
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import '@firebase/auth';
import '@firebase/firestore';
import {from, Observable} from "rxjs";
import {filter, flatMap, map, toArray} from "rxjs/operators";


export class JobsService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    public getArtifacts(applicationId: string, versionId: string): Observable<Artifact[]> {
        const query = this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .doc(versionId)
            .collection(CollectionName.ARTIFACTS)
            .where("", "==", "");

        return this.firebaseRepo.getQuery<Artifact>(query)
            .pipe(
                flatMap(from),
                filter((artifact: Artifact) => artifact.type !== 'test'),
                toArray()
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


    // public getAllJobs(): Observable<Job[]> {
    //     return from(this.firebaseRepo.getCollection(CollectionName.JOBS).get())
    //         .map(value => value.docs)
    //         .flatMap(from)
    //         .flatMap(doc => this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS)
    //             .where("job", '==', doc.ref))
    //         .map(document => {
    //
    //         }
    //
    //
    //     {
    //         const data = doc.data();
    //         const jobsTasks = await firebase.firestore().collection('jobs-tasks').where('job', '==', doc.ref).get();
    //         return <FirebaseModel>{
    //             ...data,
    //             _ref: doc.ref,
    //         };
    //     }
    // )
    // .
    //     flatMap(promise => from(promise))
    //         .toArray();
    // }


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
}
