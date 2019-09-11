import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION} from "./api";
import {ANALYSE_APK, CLEAN_ARTIFACT, GET_FILE_DATA, SAVE_SPOON_RESULT} from "./storage";
import * as admin from "firebase-admin";
import {jobService} from "./job/job.service";
import {CallableContext} from "firebase-functions/lib/providers/https";
import QuerySnapshot = admin.firestore.QuerySnapshot;
import DecodedIdToken = admin.auth.DecodedIdToken;

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
                .then(() => "api key added")
        }
        return Promise.resolve("api key exist")
    })
    .catch(e => console.error("Error checking apiKey", e));


const functions = require('firebase-functions');

admin.firestore().collection('user-security')
    .onSnapshot(querySnapshot => {
        querySnapshot.docChanges().forEach(change => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log('User security added or modified: ', change.doc.data());
                admin.auth().setCustomUserClaims(change.doc.data().uid, {role: change.doc.data().role})
                    .then(() => {
                        console.log(`Claims for user ${change.doc.data().uid} updated with success`)
                    }).catch(reason => {
                    console.error("can't add claim", reason)
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

function createCustomToken(uid: string, role: string, parentUid: string): Promise<{ token: string }> {
    return admin
        .auth()
        .createCustomToken(uid, <DeveloperClaims>{
            role: role,
            parent: parentUid
        })
        .then(function (customToken) {
            console.log(`Custom token generated = [${customToken}], uid = [${uid}}, role = [${role}]`);
            const data = {token: customToken};
            return admin.firestore().collection("token-security").doc(uid).set({
                ...data,
                role: role,
                parentUid: parentUid
            }).then(() => data)
        })
        .catch(function (error) {
            console.error("createCustomToken() error", error);
            throw new functions.https.HttpsError("failed-token", error);
        });
}

function refreshCustomToken(uid: string, oldToken: string): Promise<{ token: string }> {
    return admin.firestore().collection("token-security").doc(uid).get()
        .then(value => {
            const data = value.data();
            if (value.exists && data && data.token === oldToken) {
                return createCustomToken(uid, data.role, data.parentUid)
            } else {
                return Promise.reject("Can't found token")
            }
        })


}


function saveUserSecurity(uid: string, role: string) {
    return admin.firestore().collection('user-security').doc(uid).set({
        uid: uid,
        role: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
}


exports.refreshCustomToken = functions.https.onCall((data, context) => {
    return refreshCustomToken(data.uid, data.token);
});

exports.createMobileAgent = functions.https.onCall((data: any, context: CallableContext) => {
    console.log("createMobileAgent() data = ", data);
    const token: DecodedIdToken = context.auth!.token;
    if (token.role === DESKTOP_AGENT) {
        return createCustomToken(data.uid, MOBILE_AGENT, context.auth!.uid);
    } else {
        console.error(`The role [${token.role}] is not authorized to create custom tokens for mobile`);
        throw new functions.https.HttpsError("role-unauthorized", `The role [${token.role}] is not authorized to create custom tokens for mobile`);
    }
});

exports.createAgent = functions.https.onCall(async (data: any, context: CallableContext) => {
    console.log("createMobileAgent() data = ", data);
    const token: DecodedIdToken = context.auth!.token;
    if (token.role === ADMIN) {
        await admin.firestore().collection('agents').doc(data.uid).set({
            uid: data.uid,
            devices: [],
            finalize: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return createCustomToken(data.uid, DESKTOP_AGENT, context.auth!.uid);
    } else {
        console.error(`The role [${token.role}] is not authorized to create custom tokens for desktop`);
        throw new functions.https.HttpsError("role-unauthorized", `The role [${token.role}] is not authorized to create custom tokens for desktop`);
    }
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
            if (snapshot.docs.length === 0) {
                return saveUserSecurity(user.uid, ADMIN);
            } else {
                return saveUserSecurity(user.uid, GUEST);
            }
        })
        .catch(err => {
            console.error('Error during the access to user-security');
            throw new functions.https.HttpsError("role-unauthorized", `Error during the access to userèsecurity`);
        })
});


exports.cron = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    console.log('Check task timout');
    return jobService.checkTaskTimeout()
});

exports.onTaskResult = functions.firestore.document('devices/{deviceId}').onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    return jobService.assignTasksToDevices()
});

exports.onTaskResult = functions.firestore.document('jobs-tasks/{taskId}').onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    return jobService.onTaskUpdate(change.after)
});

exports.onRemoveJob = functions.firestore.document('jobs/{jobId}').onDelete(async (snapshot: DocumentSnapshot, context: EventContext) => {
    const collection = admin.firestore().collection('jobs-tasks');
    const query: QuerySnapshot = await collection.where('job', '==', snapshot.id).get();
    query.docs.forEach(doc => doc.ref.delete());
});

exports.analyse_apk = ANALYSE_APK;
exports.clean_artifact = CLEAN_ARTIFACT;
exports.getFileData = GET_FILE_DATA;
exports.saveSpoonResult = SAVE_SPOON_RESULT;
exports.api = API_FUNCTION;
