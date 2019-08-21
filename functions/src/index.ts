import {JobStatus, TaskStatus} from "./models";
import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION} from "./api";
import {ANALYSE_APK, CLEAN_ARTIFACT} from "./storage";
import * as firebaseAdmin from "firebase-admin";
import {DocumentReference} from "@google-cloud/firestore";

const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://panda-lab-lm.firebaseio.com",
    storageBucket: "panda-lab-lm.appspot.com"
});


//Generate api key at start
const uuidv4 = require('uuid/v4');
admin.firestore().collection("config").doc("secrets").get()
    .then(document => {
        if (!document.exists || document.get("apiKey") === undefined) {
            console.warn("Generate new api key");
            return admin.firestore().collection("config").doc("secrets")
                .set({'apiKey': uuidv4()}, {merge: true})
                .then("api key added")
        }
        return Promise.resolve("api key exist")
    })
    .catch(e => console.error("Error checking apiKey", e));

import QuerySnapshot = firebaseAdmin.firestore.QuerySnapshot;

const functions = require('firebase-functions');

admin.firestore().collection('user-security')
    .onSnapshot(querySnapshot => {
        querySnapshot.docChanges().forEach(change => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('User security added or modified: ', change.doc.data());
                admin.auth.setCustomUserClaims(change.doc.data().uid, {role: change.doc.data().role})
                    .then(() => {
                        console.log(`Claims for user ${change.dov.data().uid} updated with success`)
                    })
            }
        });
    });

interface DeveloperClaims {
    role: string;
}

const MOBILE_AGENT = "mobile-agent";
const DESKTOP_AGENT = "agent";
const ADMIN = "admin";
// const USER = "user";
const GUEST = "guest";

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

function saveUserSecurity(uid: string, role: string) {
    admin.firestore().collection('user-security').doc(uid).set({
        uid: uid,
        role: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    return admin.auth()
        .verifyIdToken(data.token)
        .then(async (claims: any) => {
            console.log(`createDesktopAgent() token = [${data.token}] claims = [${JSON.stringify(claims)}`);
            if (claims.role === ADMIN) {
                await admin.firestore().collection('agents').doc(data.uid).set({
                    uid: data.uid,
                    devices: [],
                    finalize: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return await createCustomToken(data.uid, DESKTOP_AGENT);
            } else {
                console.error(`The role [${claims.role}] is not authorized to create custom tokens for desktop`);
                throw new functions.https.HttpsError("role-unauthorized", `The role [${claims.role}] is not authorized to create custom tokens for desktop`);
            }
        })
});

/**
 * On Sign up and claims
 */
exports.onSignUp = functions.auth.user().onCreate(async (user: UserRecord, context: EventContext) => {
    // https://firebase.google.com/docs/functions/auth-events
    // A Cloud Functions event is not triggered when a user signs in for the first time using a custom token.
    // see the function createAgent

    // create custom claims for web
    // return createCustomToken(user.uid, WEB_AGENT);

    admin.firestore().collection("user-security")
        .where('role', '==', ADMIN).get()
        .then(snapshot => {
            if(snapshot.empty) {
                saveUserSecurity(user.uid, ADMIN);
            } else {
                saveUserSecurity(user.uid, GUEST);
            }
        })
        .catch(err => {
            console.error('Error during the access to user-security');
            throw new functions.https.HttpsError("role-unauthorized", `Error during the access to userèsecurity`);
        })
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
    const jobId = newValue.get("job");

    const jobDocumentRef = admin.firestore().collection("jobs").doc(jobId);

    let hasFailure = false;
    let hasSuccess = false;

    const tasksList = await admin.firestore().collection("jobs-tasks").where("job", "==", jobId).get();

    const totalTasks = tasksList.docs;
    const totalTasksCompleted = totalTasks
        .map(snapshot => snapshot.data())
        .filter(dataSnapshot => {
            const taskError = dataSnapshot.status === TaskStatus.error;
            const taskSuccess = dataSnapshot.status === TaskStatus.finished;
            hasFailure = hasFailure || taskError;
            hasSuccess = hasSuccess || taskSuccess;
            return taskError || taskSuccess
        })
        .length;


    console.log(`JobsTasks ${taskId} - Compare size : ${totalTasksCompleted} / ${totalTasks.length}`);
    // compare if is same size
    const completed = totalTasks.length === totalTasksCompleted;

    let jobStatus = JobStatus.pending;
    if (hasFailure && hasSuccess) {
        jobStatus = JobStatus.unstable
    } else if (hasSuccess && completed) {
        jobStatus = JobStatus.success
    } else if (hasFailure && completed) {
        jobStatus = JobStatus.failure
    }

    await jobDocumentRef.set({completed: completed, status: jobStatus}, {merge: true});
});

exports.onRemoveJob = functions.firestore.document('jobs/{jobId}').onDelete(async (snapshot: DocumentSnapshot, context: EventContext) => {
    const collection = admin.firestore().collection('jobs-tasks');
    const query: QuerySnapshot = await collection.where('job', '==', snapshot.id).get();
    query.docs.forEach(doc => doc.ref.delete());
});

exports.analyse_apk = ANALYSE_APK;
exports.clean_artifact = CLEAN_ARTIFACT;
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
