import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {Message} from "firebase-functions/lib/providers/pubsub";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION} from "./api";
import {ANALYSE_APK} from "./storage";
import * as firebaseAdmin from "firebase-admin";

const admin = require('firebase-admin');
import CollectionReference = firebaseAdmin.firestore.CollectionReference;
import QuerySnapshot = firebaseAdmin.firestore.QuerySnapshot;
import {DocumentReference} from "@google-cloud/firestore";

const functions = require('firebase-functions');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://panda-lab-lm.firebaseio.com",
    storageBucket: "panda-lab-lm.appspot.com"
});

interface DeveloperClaims {
    role: string;
}

const MOBILE_AGENT = "mobile-agent";
const DESKTOP_AGENT = "agent";
const WEB_AGENT = "web";

function createCustomToken(uid: string, role: string): Promise<string> {
    return admin
        .auth()
        .createCustomToken(uid, <DeveloperClaims>{
            role: role
        })
        .then(function (customToken) {
            console.log(`Custom token generated = [${customToken}], uid = [${uid}}, role = [${role}]`);
            return {token: customToken};
        })
        .catch(function (error) {
            console.error("createCustomToken() error", error);
            throw new functions.https.HttpsError("failed-token", error);
        });
}

exports.generate_custom_jwt_token = functions.https.onCall((data, context) => {
    return createCustomToken(data.uid, MOBILE_AGENT);
});

exports.createMobileAgent = functions.https.onCall((data: any) => {
    console.log("createMobileAgent() data = ", data);
    return admin.auth()
        .verifyIdToken(data.token)
        .then(async (claims: any) => {
            console.log(`createMobileAgent() token = [${data.token}] claims = [${JSON.stringify(claims)}`);
            if (claims.role === DESKTOP_AGENT) {
                return await createCustomToken(data.uid, MOBILE_AGENT);
            } else {
                console.error(`The role [${claims.role}] is not authorized to create custom tokens for mobile`);
                throw new functions.https.HttpsError("role-unauthorized", `The role [${claims.role}] is not authorized to create custom tokens for mobile`);
            }
        })
});

exports.createAgent = functions.https.onCall(async (data: any) => {
    await admin.firestore().collection('agents').doc(data.uid).set({
        uid: data.uid,
        devices: [],
        finalize: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return createCustomToken(data.uid, DESKTOP_AGENT);
});

/**
 * On Sign up and claims
 */
exports.onSignUp = functions.auth.user().onCreate(async (user: UserRecord, context: EventContext) => {
    // https://firebase.google.com/docs/functions/auth-events
    // A Cloud Functions event is not triggered when a user signs in for the first time using a custom token.
    // see the function createAgent

    // create custom claims for web
    return createCustomToken(user.uid, WEB_AGENT);
});

exports.runJob = functions.pubsub.topic('run-job').onPublish((message: Message, context: EventContext) => {
    // const body = message.json;
    // const jobId = context.eventId;
    // console.log(`topic 'run-job' received a message `, JSON.stringify(body));
    // const {apkUrl, name, device} = body;
    // console.log(`Run job [${name}] with apk : ${apkUrl}. Device target : ${device}`);
    //
    // return admin.messaging().sendToTopic(device, {
    //     data: {jobId, name, apkUrl,}
    // });
});

/**
 * Differents status : [ 'pending', 'installing', 'running', 'finish', 'error' ]
 */
exports.initJob = functions.https.onRequest(async (req, res) => {

    const applicationReference = admin.firestore()
        .collection('applications')
        .doc('demo')
        .collection('versions')
        .doc('1010');

    const job = await admin.firestore().collection('jobs').add({
        application: applicationReference,
        tasks: [],
        completed: false
    });

    const documentReferences = await admin.firestore().collection('devices').listDocuments();
    documentReferences.forEach(async (documentReference: DocumentReference) => {
        const task = await admin.firestore().collection('jobs-tasks').add({
            job: admin.firestore().collection('jobs').doc(job.id),
            device: documentReference,
            status: 'pending', // status [ 'pending', 'installing', 'running', 'finish', 'error' ]
        });


        const merge = true;
        const tasks = [task];
        await job.set({tasks}, {merge});
    });


    res.status(200).send();
});


exports.onTaskResult = functions.firestore.document('jobs-tasks/{taskId}').onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    const taskId = context.params.taskId;
    const newValue: DocumentSnapshot = change.after!;
    const data = newValue.data()!;

    // get total jobs tasks completed
    const collection: CollectionReference = change.after.ref.parent;
    const jobsTasksSnapshot = await collection.where('job', '==', data.job).get();
    const totalTasksCompleted = jobsTasksSnapshot.docs
        .map(snapshot => snapshot.data())
        .filter(dataSnapshot => dataSnapshot.status === 'error' || dataSnapshot.status === 'finish')
        .length;

    // get total tasks in job
    const jobsCollection: CollectionReference = admin.firestore().collection('jobs');
    const jobSnapshot: DocumentSnapshot = await jobsCollection.doc(data.job.id).get();
    const totalTasks = jobSnapshot.data()!.tasks.length;

    console.log(`JobsTasks ${taskId} - Compare size : ${totalTasksCompleted} / ${totalTasks}`);
    // compare if is same size
    if (totalTasks === totalTasksCompleted) {
        console.log(`Job ${data.job.id} completed`);
        await jobSnapshot.ref.set({completed: true}, {merge: true});
    }
});

exports.onRemoveJob = functions.firestore.document('jobs/{jobId}').onDelete(async (snapshot: DocumentSnapshot, context: EventContext) => {
    const jobId = context.params.jobId;
    const ref = admin.firestore().collection('jobs').doc(jobId);
    const collection = admin.firestore().collection('jobs-tasks') as CollectionReference;
    const query: QuerySnapshot = await collection.where('job', '==', ref).get();
    query.docs.forEach(doc => doc.ref.delete());
});

exports.analyse_apk = ANALYSE_APK;
exports.api = API_FUNCTION;

// exports.onTaskCreated = functions.firestore.document('jobs-tasks/{taskId}').onCreate(async (snapshot: DocumentSnapshot, context: EventContext) => {
//     const data = snapshot.data();
//     if (data === undefined) {
//         return;
//     }
//
//     const taskId = context.params.taskId;
//     const device = data.device;
//     const job = await data.job.get();
//     const pending = 'pending';
//     const merge = true;
//
//     await snapshot.ref.set({ status: pending}, {merge});
//
//     return await admin.messaging().sendToTopic(device.id, {
//         data: {
//             task_id: taskId,
//             job_id: job.id,
//             apk_url: job.data().apk,
//             reference_path: snapshot.ref.path
//         },
//     });
// });
