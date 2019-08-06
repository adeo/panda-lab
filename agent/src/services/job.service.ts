import {AxiosInstance} from "axios";
import * as firebase from 'firebase';
import {API_HEADERS, API_URL} from "@/services/firebase.service";
import {from, Observable} from "rxjs";
import "rxjs-compat/add/operator/filter";
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

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
                    _path: doc.ref.path,
                    id: doc.id,
                    ...doc.data()
                };
            })
            .toArray();
    }

    public getJobs(application: any, version: any) {
        return jobService.getArtifacts(application, version)
            .flatMap(from)
            .map(artifact => artifact._path)
            .flatMap(path => {
                const jobs = firebase.firestore().collection('jobs').where('apk', '==', firebase.firestore().doc(path)).get();
                return from(jobs);
            })
            .flatMap(snapshot => from(snapshot.docs))
            .map(doc => {
                return {
                    _id: doc.id,
                    _path: doc.ref.path,
                    ...doc.data()
                };
            })
            .toArray()
            .map(result => result.flat());
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

        console.log(JSON.stringify({
            artifact,
            devices,
            groups
        }));
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

}

export const jobService = new JobService();
