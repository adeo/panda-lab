import {Change, EventContext} from "firebase-functions";
import {UserRecord} from "firebase-functions/lib/providers/auth";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {API_FUNCTION, CREATE_JOB} from "./api";
import {ANALYSE_FILE, CLEAN_ARTIFACT, SAVE_SPOON_RESULT} from "./storage";
import * as admin from "firebase-admin";
import {jobService} from "./services/job.service";
import {CallableContext, HttpsError} from "firebase-functions/lib/providers/https";
import {deviceService} from "./services/device.service";
import {CollectionName, Role} from "pandalab-commons";
import {securityService} from "./services/security.service";

admin.initializeApp();

securityService.initialize();

const functions = require('firebase-functions');


exports.updateUserClaims = functions.firestore.document(CollectionName.USERS_SECURITY + '/{userId}').onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    const uid = context.params.userId;
    return securityService.updateUserClaim(uid, change.after);
});

exports.refreshCustomToken = functions.https.onCall((data, context) => {
    return securityService.refreshCustomToken(data.uid, data.token);
});

exports.createMobileAgent = functions.https.onCall((data: any, context: CallableContext) => {
    console.log("createMobileAgent() data = ", data);
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'user not logged')
    } else {
        const uid: string = data.uid;
        const auth = context.auth;
        return securityService.createMobileAgent(uid, auth);
    }
});

exports.createAgent = functions.https.onCall(async (data: any, context: CallableContext) => {
    console.log("createMobileAgent() data = ", data);
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'user not logged')
    } else {
        const uid: string = data.uid;
        const auth = context.auth;
        return securityService.createAgent(uid, auth);
    }
});

exports.updateDeviceInfos = functions.https.onCall(async (data: any, context: CallableContext) => {
    console.log("updateDeviceInfos data = ", data);
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'user not logged')
    } else if (context.auth.token.role === Role.agent) {
        return deviceService.updateDeviceInfos(data.uid);
    } else {
        const message = `The role [${context.auth.token.role}] is not authorized to update device infos`;
        console.error(message);
        throw new functions.https.HttpsError("role-unauthorized", message);
    }
});


exports.onUserCreate = functions.auth.user().onCreate(async (user: UserRecord, context: EventContext) => {
    return securityService.onUserCreated(user.uid)
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

exports.onDeviceUpdate = functions.firestore.document(CollectionName.DEVICES + '/{deviceId}').onUpdate(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    if (change.after.exists && (!change.before.exists || change.before.get("status") !== change.after.get("status"))) {
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

exports.onJobDelete = functions.firestore.document(CollectionName.JOBS + '/{jobId}').onDelete(async (snapshot: DocumentSnapshot, context: EventContext) => {
    return jobService.onJobDelete(snapshot.id);
});

exports.analyseFile = ANALYSE_FILE;
exports.cleanArtifact = CLEAN_ARTIFACT;
exports.saveSpoonResult = SAVE_SPOON_RESULT;
exports.createJob = CREATE_JOB;
exports.api = API_FUNCTION;
