import * as functions from 'firebase-functions';
import * as util from "util";
import {
    AppModel,
    AppVersion,
    Artifact,
    CollectionName,
    JobTask,
    LogsModel,
    TestModel,
    TestResult
} from "pandalab-commons";
import {FileData, TestLog} from "../../commons/src/models";
import DocumentReference = FirebaseFirestore.DocumentReference;

const admin = require('firebase-admin');

const ApkReader = require('adbkit-apkreader');
const yauzl = require("yauzl");
const Promise2 = require('bluebird');

class ApkReaderFromBuffer extends ApkReader {
    _openBuffer() {
        return Promise2.fromCallback(callback => {
            return yauzl.fromBuffer(this.apk, {lazyEntries: true}, callback);
        });
    }
}

ApkReader.prototype._open = ApkReaderFromBuffer.prototype._openBuffer;

export const ANALYSE_FILE = functions.storage.bucket().object().onFinalize(async (object, context) => {
    const path = `${object.name}`;

    if (path.startsWith('upload')) {
        if (path.endsWith(".apk")) {
            const filename = path.split('/').slice(-1).join();
            return extractApk(filename)
                .catch(reason => {
                    console.error("Can't process file", reason);
                    return admin.storage().bucket().file(path).delete()
                });
        }
    } else if (path.startsWith('reports') && path.endsWith('spoon.json')) {
        return extractSpoonReport(path);
    }


    console.log("File ignored :", path);
    return Promise.resolve("ignore file");


});

export const CLEAN_ARTIFACT = functions.firestore.document('applications/{appId}/versions/{versionId}/artifacts/{artifactId}')
    .onDelete((snapshot) => {
        const path = snapshot.get("path");
        console.log("remove file of " + snapshot.id, path);
        return admin.storage().bucket().file(path).delete()
    });


async function extractSpoonReport(path: string) {

    const taskId = path.split('/')[1];

    const downloadResponses = await admin.storage().bucket().file(path).download();
    const buffer: Buffer = downloadResponses[0];

    const json: any = JSON.parse(buffer.toString());

    console.log("json test", json);

    const id = Object.keys(json.results)[0];
    const value = json.results[id];
    const jobTaskRef = admin.firestore().collection(CollectionName.JOBS_TASKS).doc(taskId);
    const jobTask = (await jobTaskRef.get()).data() as JobTask;

    const testLogs = new Map<DocumentReference, LogsModel>();
    const result = <TestModel>{
        id: id,
        job: jobTask.job,
        device: jobTask.device,
        duration: json.duration,
        tests: value.testResults.map(test => {
                const testHeader = test[0];
                const testValue = test[1];

                const testId = testHeader.className + "_" + testHeader.methodName;

                const logs = testValue.log.map(log => {
                    const timestamp = log.mTimestamp;
                    const date = timestamp ? new Date(new Date().getFullYear(), timestamp.mMonth, timestamp.mDay, timestamp.mHour,
                        timestamp.mMinute, timestamp.mSecond, timestamp.mMilli) : new Date();
                    return <TestLog>{
                        level: log.mHeader.mLogLevel,
                        tag: log.mHeader.mTag,
                        date: admin.firestore.Timestamp.fromDate(date),
                        message: log.mMessage,
                    };
                });

                const logsRef = admin.firestore()
                    .collection(CollectionName.TASK_REPORTS)
                    .doc(taskId)
                    .collection(CollectionName.LOGS)
                    .doc(testId);

                testLogs.set(logsRef, <LogsModel>{
                    logs: logs
                });


                return <TestResult>{
                    id: testId,
                    status: testValue.status,
                    duration: testValue.duration,
                    screenshots: testValue.screenshots.map(imagePath => "reports/" + taskId + "/images/" + imagePath.split('/').slice(-1).join()),
                    logs: logsRef,
                };
            },
        ),
        started: admin.firestore.Timestamp.fromMillis(json.started),
    };

    await admin.firestore().collection(CollectionName.TASK_REPORTS).doc(taskId).set(result, {merge: false});

    for (const entry of testLogs.entries()) {
        await entry[0].set(entry[1], {merge: false})
    }

    return Promise.resolve(result);


}

async function extractApk(filename: string) {
    const fullPath = 'upload/' + filename;
    const part = filename.replace('.apk', '').split('_');
    const appName = part[0];
    const uuid = part[1];
    const flavor = part[2];
    const buildType = part[3];
    const type = part[4];

    const response = await admin.storage().bucket().file(fullPath).download();
    const reader = await ApkReaderFromBuffer.open(response[0]);
    const manifest = await reader.readManifest();
    console.log(util.inspect(manifest, {depth: null}));

    const newPath = "applications/" + appName + "/" + filename;


    const appData = <AppVersion>{
        flavor: flavor,
        appName: appName,
        package: manifest.package,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const artifactData = <Artifact>{
        package: manifest.package,
        path: newPath,
        flavor: flavor,
        buildType: buildType,
        type: type,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    if (manifest.versionCode) {
        appData.versionCode = manifest.versionCode;
        artifactData.versionCode = manifest.versionCode;
    }
    if (manifest.versionName) {
        appData.versionName = manifest.versionName;
        artifactData.versionName = manifest.versionName;
    }

    await admin.firestore().collection(CollectionName.APPLICATIONS).doc(appName).set(<AppModel>{name: appName}, {merge: true});

    const doc = admin.firestore().collection(CollectionName.APPLICATIONS).doc(appName).collection(CollectionName.VERSIONS).doc(uuid);
    try {
        await admin.storage().bucket().file(fullPath).move(newPath);
        await doc.set(appData, {merge: true});
        await doc.collection(CollectionName.ARTIFACTS).doc(filename.replace('.apk', '')).set(artifactData, {merge: false});
    } catch (e) {
        console.warn("delete moved file in " + newPath);
        await admin.storage().bucket().file(newPath).delete()
    }
    return "ok"
}


export const GET_FILE_DATA = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", `Not authorized to access file data`);
    }

    const filePath = data.path;
    const fileRef = admin.storage().bucket().file(filePath);
    const metadatas = await fileRef.getMetadata();
    const metadata = metadatas[0];

    const url = await fileRef.getSignedUrl({expires: Date.now() + 1000 * 60 * 60, action: "read"});
    return <FileData>{
        downloadUrl: url[0],
        createdAt: new Date(metadata.timeCreated).getTime(),
        updatedAt: new Date(metadata.updated).getTime()
    }

});

export const SAVE_SPOON_RESULT = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", `Not authorized to access file data`);
    }
    try {
        const jobId = data.jobId;
        const deviceId = data.deviceId;
        const result = data.result;
        const stream = admin.storage().bucket().file(`reports/${jobId}/devices/${deviceId}/result.json`).createWriteStream();
        stream.write(JSON.stringify(result));
        stream.end();
        return {
            success: true,
        };
    } catch (e) {
        return {
            success: false,
        }
    }
});
