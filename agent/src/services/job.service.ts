import {AxiosInstance} from "axios";
import * as firebase from 'firebase';
import {API_HEADERS, API_URL} from "@/services/firebase.service";
import {from, Observable} from "rxjs";
import "rxjs-compat/add/operator/filter";
import {Artifact, Job, JobTask} from '@/models/jobs';
import {Device} from "@/models/device";
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import DocumentReference = firebase.firestore.DocumentReference;

const axios: AxiosInstance = require('axios');

class JobService {

    public getArtifacts(applicationId: string, versionId: string): Observable<any[]> {
        const query = firebase.firestore()
            .collection('applications')
            .doc(applicationId)
            .collection('versions')
            .doc(versionId)
            .collection('artifacts')
            .get();

        return from(query)
            .map(querySnapshot => querySnapshot.docs)
            .flatMap(from)
            .filter((doc: QueryDocumentSnapshot) => doc.data().type !== 'test')
            .map((doc: QueryDocumentSnapshot) => {
                return {
                    ...doc.data(),
                    _path: doc.ref.path,
                    id: doc.id,
                };
            })
            .toArray();
    }

    public getJob(id: string) {
        return from(firebase.firestore().collection('jobs').doc(id).get())
            .map(async doc => {
                const data = doc.data();
                return <Job>{
                    apk: await this.getArtifact(data.apk),
                    apkTest: await this.getArtifact(data.apk_test),
                    _id: doc.id,
                    _path: doc.ref.path,
                };
            })
            .flatMap(from)
    }

    public getJobs(application: any, version: any) {
        return this.getArtifacts(application, version)
            .flatMap(from)
            .map(artifact => artifact._path)
            .flatMap(path => {
                const jobs = firebase.firestore().collection('jobs').where('apk', '==', firebase.firestore().doc(path)).get();
                return from(jobs);
            })
            .flatMap(snapshot => from(snapshot.docs))
            .map(doc => {
                return <Job>{
                    ...doc.data(),
                    _id: doc.id,
                    _path: doc.ref.path,
                };
            })
            .toArray()
            .map(result => result.flat());
    }

    private getArtifact = async (data: any) => {
        const documentReference = data as DocumentReference;
        const documentSnapshot = await documentReference.get();
        return <Artifact>{
            ...documentSnapshot.data(),
            _id: documentReference.id,
            _path: documentReference.path,
        }
    };

    public getAllJobs(): Observable<Job[]> {
        return from(firebase.firestore().collection('jobs').get())
            .map(value => value.docs)
            .flatMap(from)
            .map(async doc => {
                const data = doc.data();
                const jobsTasks = await firebase.firestore().collection('jobs-tasks').where('job', '==', doc.ref).get();
                return <Job>{
                    ...data,
                    _id: doc.id,
                    _path: doc.ref.path,
                    apk: await this.getArtifact(data.apk),
                    apkTest: await this.getArtifact(data.apk_test),
                    totalTasks: jobsTasks.docs.length,
                };
            })
            .flatMap(promise => from(promise))
            .toArray();
    }

    public async createJob(applicationId: string, versionId: string, artifactId: string): Promise<string> {
        const artifactDocumentReference = firebase.firestore()
            .collection('applications')
            .doc(applicationId)
            .collection('versions')
            .doc(versionId)
            .collection('artifacts')
            .doc(artifactId);


        const devicesSnapshot = await firebase.firestore().collection('devices').get();
        const devices = devicesSnapshot.docs.map(doc => doc.id);
        const groups = []; // TODO select group;

        const artifact = artifactDocumentReference.path;

        const response = await axios.post(`${API_URL}/api/createJob`, {
            artifact,
            devices,
            groups
        }, {
            headers: API_HEADERS
        });
        const data = response.data;
        return data.jobId;
    }

    public getJobsTasks(jobId: string): Observable<JobTask[]> {
        const jobReference = firebase.firestore().collection('jobs').doc(jobId);
        const promise = firebase.firestore().collection('jobs-tasks').where('job', '==', jobReference).get();
        return from(promise)
            .map(query => query.docs)
            .flatMap(from)
            .map(async (doc: QueryDocumentSnapshot) => {
                const deviceDocument = await (doc.data().device as DocumentReference).get();
                const device = deviceDocument.data() as Device;
                device._id = deviceDocument.id;
                device._path = deviceDocument.ref.path;

                const jobDocument = await (doc.data().job as DocumentReference).get();
                const job = jobDocument.data() as Job;
                job._id = jobDocument.id;
                job._path = jobDocument.ref.path;

                return <JobTask>{
                    ...doc.data(),
                    _id: doc.id,
                    _path: doc.ref.path,
                    device,
                    job,
                }
            })
            .flatMap(from)
            .toArray();
    }

    public getJobTask(taskId: string): Observable<JobTask> {
        const promise = firebase.firestore().collection('jobs-tasks').doc(taskId).get();
        return from(promise)
            .map(async (doc: QueryDocumentSnapshot) => {
                const deviceDocument = await (doc.data().device as DocumentReference).get();
                const device = deviceDocument.data() as Device;
                device._id = deviceDocument.id;
                device._path = deviceDocument.ref.path;

                const jobDocument = await (doc.data().job as DocumentReference).get();
                const job = jobDocument.data() as Job;
                job._id = jobDocument.id;
                job._path = jobDocument.ref.path;

                return <JobTask>{
                    ...doc.data(),
                    _id: doc.id,
                    _path: doc.ref.path,
                    device,
                    job,
                }
            })
            .flatMap(from)
    }

}

export const jobService = new JobService();
