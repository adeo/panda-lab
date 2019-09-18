import * as admin from "firebase-admin";
import * as firebase from "firebase";
import {DeviceStatus, Job, JobRequest, JobStatus, JobTask, TaskStatus, TestStatus} from "pandalab-commons";
import DocumentSnapshot = admin.firestore.DocumentSnapshot;
import DocumentReference = firebase.firestore.DocumentReference;
import Timestamp = firebase.firestore.Timestamp;


export enum JobError {
    NOT_DEBUG = "Artifact type has to be debug",
    TEST_APK_NOT_FOUND = "Test artifact not found",
    NO_DEVICE_FOUND = "No device found"
}

class JobService {

    async createJob(job: JobRequest): Promise<admin.firestore.DocumentReference> {
        //Check if artifact exist
        const artifactDoc = await admin.firestore().doc(job.artifact).get();
        if (!artifactDoc.exists || artifactDoc.get("type") !== "debug") {
            throw JobError.NOT_DEBUG;
        }

        //Check if artifact has test apk
        const artifactsCollection = artifactDoc.ref.parent;
        const artifactTestDocs = await artifactsCollection
            .where("type", "==", "test")
            .where("buildType", "==", artifactDoc.get("buildType"))
            .where("flavor", "==", artifactDoc.get("flavor")).limit(1).get();

        if (artifactTestDocs.empty) {
            throw JobError.TEST_APK_NOT_FOUND;
        }
        const artifactTestDoc = artifactTestDocs.docs[0];

        //Check devices ids
        const devicesQuery: string[][] = await Promise.all(
            job.groups.map(async (group: string) => {
                const result = await admin.firestore().collection("deviceGroups").doc(group).get();
                return result.get("devices")
            })
        );
        let devicesList = devicesQuery.reduce((prev, curr) => prev.concat(curr), []);
        devicesList = devicesList.concat(job.devices);

        const devicesSet = new Set<string>();
        devicesList.map(device => devicesSet.add(device));


        //No device set we use all devices by default
        let finalDevices: string[] = [];
        if (devicesList.length === 0) {
            finalDevices = (await admin.firestore().collection("devices").listDocuments()).map(value => value.id)
        } else {
            finalDevices = await Promise.all(Array.from<string>(devicesSet.values()).filter(async deviceId => {
                const deviceDoc = await admin.firestore().collection("devices").doc(deviceId).get();
                return deviceDoc.exists
            }));
        }

        if (finalDevices.length === 0) {
            throw JobError.NO_DEVICE_FOUND
        }

        let taskCount: number = finalDevices.length;
        if (job.devicesCount > 0) {
            taskCount = Math.min(job.devicesCount, finalDevices.length)
        }


        //Create job and tasks
        const createdJob = {
            apk: artifactDoc.ref as any as DocumentReference,
            apk_test: artifactTestDoc.ref as any as DocumentReference,
            completed: false,
            status: JobStatus.pending,
        } as Job;

        const jobRef = await admin.firestore().collection('jobs').add(createdJob);

        const timeoutInMillis = ((job.timeoutInSecond || 60 * 60) * 1000);
        await Promise.all(new Array(taskCount).fill(0).map(
            async () => {
                const taskObj = {
                    job: admin.firestore().collection('jobs').doc(jobRef.id) as any as DocumentReference,
                    devices: finalDevices,
                    status: TaskStatus.pending,
                    timeout: admin.firestore.Timestamp.fromMillis(admin.firestore.Timestamp.now().seconds * 1000 + timeoutInMillis)
                } as JobTask;
                (taskObj as any).device = null;
                return await admin.firestore().collection('jobs-tasks').add(taskObj);
            }
        ));

        return jobRef
    }


    async onTaskUpdate(taskDoc: DocumentSnapshot) : Promise<any> {
        const task = taskDoc.data() as JobTask;


        if (task.status === TaskStatus.pending) {
            console.log('onTaskWrited pending');
            if (!task.device) {
                console.log('onTaskWrited not device');
                return this.assignTasksToDevices(taskDoc)
            }
            console.log("onTaskWrited task pending. skip job update");
            return Promise.resolve();
        }



        const jobRef = task.job;

        const tasksList = await admin.firestore().collection("jobs-tasks").where("job", "==", jobRef).get();


        const jobTasks = tasksList.docs.map(value => value.data() as JobTask);
        const finishTasks = jobTasks.filter(value => value.completed).length;


        console.log(`Job progress : ${finishTasks} / ${jobTasks.length}`);
        // compare if is same size
        const completed = jobTasks.length === finishTasks;

        let jobStatus = JobStatus.inprogress;
        if (completed) {
            const hasTestFailure = jobTasks.filter(value => value.status === TaskStatus.success)
                .filter(value => value.result.results
                    .filter(r => r.installFailed || r.tests.filter(test => test.status !== TestStatus.pass).length > 0)
                    .length > 0
                ).length > 0;

            const hasErrorTask = jobTasks.filter(value => value.status === TaskStatus.error).length > 0;

            if (hasTestFailure) {
                jobStatus = JobStatus.failure
            } else if (hasErrorTask) {
                jobStatus = JobStatus.unstable
            } else {
                jobStatus = JobStatus.success
            }
        }
        return jobRef.set({completed: completed, status: jobStatus}, {merge: true});


    }

    async checkTaskTimeout() {
        const timeoutTasks = await admin.firestore().collection('jobs-tasks')
            .where("completed", "==", false)
            .where("timeout", '<', Timestamp.now())
            .get();

        return Promise.all(timeoutTasks.docs.map(async doc => {
            return await doc.ref.set({
                status: TaskStatus.error,
                error: 'Timeout reached',
                completed: true,
            } as JobTask, {merge: true})
        }))
    }

    async assignTasksToDevices(currentTask?: DocumentSnapshot) {
        console.log('assignTasksToDevices');
        let tasksDocs: DocumentSnapshot[];
        if (currentTask) {
            tasksDocs = [currentTask]
        } else {
            const tasksQuery = await admin.firestore().collection('jobs-tasks')
                .where("status", "==", JobStatus.pending)
                .where("device", "==", null)
                .get();
            tasksDocs = tasksQuery.docs
        }

        console.log('onTaskWrited tasksDocs length = ' + tasksDocs.length);

        if (tasksDocs.length === 0) {
            console.log("no tasks to assign");
            return
        }

        const devicesQuery = await admin.firestore().collection("devices")
            .where("status", "==", DeviceStatus.available)
            .orderBy("lastConnexion", "asc").get();

        const devices = devicesQuery.docs;
        for(let i = 0; i < tasksDocs.length; i++) {
            const taskDoc = tasksDocs[i];
            const task = taskDoc.data() as JobTask;

            const jobTasksQuery = await admin.firestore().collection('jobs-tasks')
                .where("job", "==", task.job)
                .get();

            const alreadyUsedDevices = jobTasksQuery.docs
                .map(value => value.data() as JobTask)
                .map(value => value.device)
                .filter(value => value !== null && value !== undefined)
                .map(value => value.id);


            const deviceIndex = devices
                .findIndex(value => alreadyUsedDevices.indexOf(value.id) < 0 && task.devices.indexOf(value.id) >= 0);

            console.log('onTaskWrited deviceIndex = ' + deviceIndex);
            if (deviceIndex >= 0) {
                const selectedDevice = devices.splice(deviceIndex, 1)[0];
                console.log("assign task " + taskDoc.id + " to " + selectedDevice.id);
                await taskDoc.ref.set({
                    "device": selectedDevice.ref as any as DocumentReference
                } as JobTask, {merge: true})
            }
        }
        // const cacheUsedDevices = new Set<string>();
        // return Promise.all(tasksDocs.map(
        //     async taskDoc => {
        //         const task = taskDoc.data() as JobTask;
        //
        //         const jobTasksQuery = await admin.firestore().collection('jobs-tasks')
        //             .where("job", "==", task.job)
        //             .get();
        //
        //         const alreadyUsedDevices = jobTasksQuery.docs
        //             .map(value => value.data() as JobTask)
        //             .map(value => value.device)
        //             .filter(value => value !== null && value !== undefined)
        //             .map(value => value.id);
        //
        //         const devices = devicesQuery.docs;
        //         const deviceIndex = devices
        //             .findIndex(value => !cacheUsedDevices.has(value.id) && alreadyUsedDevices.indexOf(value.id) < 0 && task.devices.indexOf(value.id) >= 0);
        //
        //         console.log('onTaskWrited deviceIndex = ' + deviceIndex);
        //         if (deviceIndex >= 0) {
        //             const selectedDevice = devices.splice(deviceIndex, 1)[0];
        //             cacheUsedDevices.add(selectedDevice.id);
        //             console.log("assign task " + taskDoc.id + " to " + selectedDevice.id);
        //             return taskDoc.ref.set({
        //                 "device": selectedDevice.ref as any as DocumentReference
        //             } as JobTask, {merge: true})
        //         } else {
        //             return Promise.resolve();
        //         }
        //     }
        // ));
    }

}


export const jobService = new JobService();
