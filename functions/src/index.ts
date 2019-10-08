import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION, CREATE_JOB} from "./api";
import {ANALYSE_FILE, CLEAN_ARTIFACT, SAVE_SPOON_RESULT} from "./storage";
import * as admin from "firebase-admin";
import {jobService} from "./services/job.service";
import {CallableContext} from "firebase-functions/lib/providers/https";
import {deviceService} from "./services/device.service";
import {CollectionName} from "pandalab-commons";
import {AgentModel} from "../../commons/src/models/agents.models";
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
                const uid = change.doc.data().uid;
                admin.auth().getUser(uid)
                    .then(user => {
                        return change.doc.ref.set({email: user.email}, {merge: true});
                    })
                    .catch(reason => {
                        console.error("can't add email in user-security", reason);
                    });

                admin.auth().setCustomUserClaims(uid, {role: change.doc.data().role})
                    .then(() => {
                        console.log(`Claims for user ${change.doc.data().uid} updated with success`)
                    }).catch(reason => {
                    console.error("can't add claim", reason)
                });
            } else if (change.type === 'removed') {
                admin.auth().deleteUser(change.doc.id)
                    .catch(reason => {
                        console.error("Can't delete auth user", reason);
                    });
            }
        });
    });

interface DeveloperClaims {
    role: string;
}

const MOBILE_AGENT = "mobile-agent";
const DESKTOP_AGENT = "agent";
const ADMIN = "admin";
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

exports.updateDeviceInfos = functions.https.onCall(async (data: any, context: CallableContext) => {
    console.log("updateDeviceInfos data = ", data);
    const token: DecodedIdToken = context.auth!.token;
    if (token.role === DESKTOP_AGENT) {
        return deviceService.updateDeviceInfos(data.uid);
    } else {
        let message = `The role [${token.role}] is not authorized to update device infos`;
        console.error(message);
        throw new functions.https.HttpsError("role-unauthorized", message);
    }
});

exports.createAgent = functions.https.onCall(async (data: any, context: CallableContext) => {
    console.log("createMobileAgent() data = ", data);
    const token: DecodedIdToken = context.auth!.token;
    if (token.role === ADMIN) {
        await admin.firestore().collection(CollectionName.AGENTS).doc(data.uid).set(<AgentModel>{
            name: data.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            online: false
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

exports.updateDevicesStatus = functions.database.ref("/agents/{agentId}/online").onUpdate((change, context) => {
    return deviceService.updateAgentDevicesStatus(change.after.val(), context.params['agentId']);
});

exports.cron = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    console.log('Send update notification');
    await deviceService.updateDevicesInfos();
    console.log('Check tasks timeout');
    return jobService.checkTaskTimeout()
});

exports.onDeviceUpdated = functions.firestore.document(CollectionName.DEVICES + '/{deviceId}').onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {

    if (change.after.exists && (!change.before.exists || !change.before.get("status") !== change.after.get("status"))) {
        await deviceService.notifyDeviceStatusChange(change.after.id, change.after.get("status"))
    }
    return jobService.assignTasksToDevices();
});


exports.onTaskWrite = functions.firestore.document(CollectionName.TASKS + '/{taskId}').onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    console.log('onTaskWrite');
    if (!change.after.exists) {
        console.log('onTaskWrite value don\'t exist');
        return;
    } else {
        console.log('onTaskWrite value exist');
    }

    return jobService.onTaskUpdate(change.after);
});

exports.onRemoveJob = functions.firestore.document(CollectionName.JOBS + '/{jobId}').onDelete(async (snapshot: DocumentSnapshot, context: EventContext) => {
    const collection = admin.firestore().collection(CollectionName.TASKS);
    const query: QuerySnapshot = await collection.where('job', '==', snapshot.id).get();
    query.docs.forEach(doc => doc.ref.delete());
});

exports.analyseFile = ANALYSE_FILE;
exports.cleanArtifact = CLEAN_ARTIFACT;
exports.saveSpoonResult = SAVE_SPOON_RESULT;
exports.createJob = CREATE_JOB;
exports.api = API_FUNCTION;
