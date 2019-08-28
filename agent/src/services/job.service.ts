import {Artifact, FirebaseModel, Job, JobTask} from 'pandalab-commons';
import {CollectionName, FirebaseRepository} from "./repositories/firebase.repository";
import {firebase} from '@firebase/app';
import '@firebase/auth';
import '@firebase/firestore';
import {firestore} from "firebase";
import {from, Observable} from "rxjs";
import {filter, flatMap, map, toArray} from "rxjs/operators";
import DocumentSnapshot = firestore.DocumentSnapshot;


function toFirebaseModel<T extends FirebaseModel>(doc: DocumentSnapshot): T {
    return {
        ...doc.data(),
        _ref: doc.ref,
    } as FirebaseModel as T
}

export class JobService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    public getArtifacts(applicationId: string, versionId: string): Observable<Artifact[]> {
        const query = this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .doc(versionId)
            .collection(CollectionName.ARTIFACTS)
            .get();

        return from(query)
            .pipe(
                map(querySnapshot => querySnapshot.docs),
                flatMap(from),
                map(doc => <Artifact>toFirebaseModel(doc)),
                filter((artifact: Artifact) => artifact.type !== 'test'),
                toArray()
            );
    }

    public getJob(id: string): Observable<Job> {
        return from(this.firebaseRepo.getCollection(CollectionName.JOBS).doc(id).get())
            .pipe(
                map(doc => <Job>toFirebaseModel(doc))
            )
    }

    public getJobs(application: any, version: any): Observable<Job[]> {
        return this.getArtifacts(application, version)
            .pipe(
                flatMap(from),
                map((artifact: Artifact) => artifact._path),
                flatMap(path => {
                    return from(this.firebaseRepo.getCollection(CollectionName.JOBS)
                        .where('apk', '==', firebase.firestore().doc(path)).get())
                        .pipe(
                            flatMap(result => from(result.docs))
                        )
                }),
                map(doc => <Job>toFirebaseModel(doc)),
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
        return from(this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS)
            .where('job', '==', jobReference).get())
            .pipe(
                flatMap(query => from(query.docs)),
                map(doc => <JobTask>toFirebaseModel(doc)),
                toArray()
            );
    }

    public getJobTask(taskId: string): Observable<JobTask> {
        return from(this.firebaseRepo.getCollection(CollectionName.JOBS_TASKS).doc(taskId).get())
            .pipe(
                map(doc => <JobTask>toFirebaseModel(doc))
            );
    }


}
