import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION} from "./api";
import {ANALYSE_APK, CLEAN_ARTIFACT} from "./storage";
import * as firebaseAdmin from "firebase-admin";
import {jobService} from "./job/job.service";

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


exports.cron = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    console.log('Check task timout');
    return jobService.checkTaskTimeout()
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
exports.api = API_FUNCTION;
