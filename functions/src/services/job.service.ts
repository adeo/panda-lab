import * as admin from "firebase-admin";
import {
    CollectionName,
    DeviceStatus,
    Job,
    JobRequest,
    JobStatus,
    JobTask,
    TaskStatus,
    TestModel,
    TestReport,
    TestStatus
} from "pandalab-commons";
import DocumentSnapshot = admin.firestore.DocumentSnapshot;
import DocumentReference = FirebaseFirestore.DocumentReference;


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
        const versionRef = artifactDoc.ref.parent.parent as any;
        const createdJob = <Job>{
            apk: artifactDoc.ref as any,
            apk_test: artifactTestDoc.ref as any,
            completed: false,
            status: JobStatus.pending,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            version: versionRef,
            app: versionRef.parent.parent,
        };

        const jobRef = await admin.firestore().collection('jobs').add(createdJob);

        const timeoutInMillis = ((job.timeoutInSecond || 60 * 60) * 1000);
        await Promise.all(new Array(taskCount).fill(0).map(
            async () => {
                const taskObj = {
                    job: admin.firestore().collection('jobs').doc(jobRef.id) as any,
                    devices: finalDevices,
                    status: TaskStatus.pending,
                    completed: false,
                    timeout: admin.firestore.Timestamp.fromMillis(admin.firestore.Timestamp.now().seconds * 1000 + timeoutInMillis)
                } as JobTask;
                (taskObj as any).device = null;
                return await admin.firestore().collection('jobs-tasks').add(taskObj);
            }
        ));

        return jobRef
    }


    async onTaskUpdate(taskDoc: DocumentSnapshot): Promise<any> {
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


        const jobTasks = tasksList.docs.map(value => <JobTask>{
            ...value.data(),
            _ref: value.ref as any
        });
        const finishTasks = jobTasks.filter(value => value.completed).length;


        console.log(`Job progress : ${finishTasks} / ${jobTasks.length}`);
        // compare if is same size
        const completed = jobTasks.length === finishTasks;

        let jobStatus = JobStatus.inprogress;
        if (completed) {


            admin.firestore().collection(CollectionName.TASK_REPORTS).doc();

            const successTasks = jobTasks.filter(value => value.status === TaskStatus.success);


            const testsMap = new Map<string, number>();


            for (const jobTask of jobTasks.filter(value => value.status === TaskStatus.success)) {
                const reportRequest = await admin.firestore().collection(CollectionName.TASK_REPORTS).doc((jobTask._ref as any as DocumentReference).id).get();

                const testResult = reportRequest.data() as TestModel;
                testResult.tests.forEach(
                    test => {
                        let currentCount = 0;
                        if (testsMap.has(test.id)) {
                            currentCount = testsMap.get(test.id) as number
                        }

                        switch (test.status) {
                            case TestStatus.error:
                            case TestStatus.fail:
                                break;
                            case TestStatus.pass:
                                testsMap.set(test.id, currentCount + 1);
                                break;
                        }
                    }
                )

            }

            let testSuccess = 0;
            let testFailure = 0;
            let testUnstable = 0;

            for (const entry of testsMap.entries()) {
                const count = entry[1];
                if (count === jobTasks.length) {
                    testSuccess = testSuccess + 1;
                } else if (count > 0) {
                    testUnstable = testUnstable + 1;
                } else {
                    testFailure = testFailure + 1;
                }
            }

            const jobResult = await jobRef.get();
            const job = jobResult.data() as Job;
            const testReport = <TestReport>{
                date: admin.firestore.Timestamp.now(),
                job: jobRef,
                devices: jobTasks.map(value => value.device),
                totalTests: testsMap.size,
                testSuccess: testSuccess,
                testFailure: testFailure,
                testUnstable: testUnstable,
                app: job.app,
            };

            await admin.firestore().collection(CollectionName.JOB_REPORTS).doc(jobRef.id).set(testReport, {merge: false});

            const onlySuccess = jobTasks.length === successTasks.length;

            const onlyError = jobTasks.length === jobTasks.filter(value => value.status === TaskStatus.error).length;

            if (onlySuccess) {
                jobStatus = JobStatus.success
            } else if (onlyError) {
                jobStatus = JobStatus.failure
            } else {
                jobStatus = JobStatus.unstable
            }
        }
        return jobRef.set({completed: completed, status: jobStatus}, {merge: true});


    }

    async checkTaskTimeout() {
        const timeoutTasks = await admin.firestore().collection('jobs-tasks')
            .where("completed", "==", false)
            .where("timeout", '<', admin.firestore.Timestamp.now())
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

        await admin.firestore().runTransaction(async transaction => {
            const devicesQuery = admin.firestore().collection("devices")
                .where("status", "==", DeviceStatus.available)
                .orderBy("lastConnexion", "asc");

            const devicesQuerySnapshot = await transaction.get(devicesQuery);

            const devices = devicesQuerySnapshot.docs;

            for (const taskDoc of tasksDocs) {
                const task = taskDoc.data() as JobTask;

                const jobTasksQuery = await admin.firestore().collection('jobs-tasks')
                    .where("job", "==", task.job);

                const jobTasksSnapshot = await transaction.get(jobTasksQuery);
                const alreadyUsedDevices = jobTasksSnapshot.docs
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
                    await transaction.set(taskDoc.ref, {
                        "device": selectedDevice.ref as any
                    } as JobTask, {merge: true})
                }
            }
        });


    }

}


export const jobService = new JobService();
