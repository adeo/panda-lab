import * as functions from 'firebase-functions';
import * as util from "util";
import {Artifact} from "pandalab-commons";
import {FileData} from "../../commons/src/models/storage.models";

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

export const ANALYSE_APK = functions.storage.bucket().object().onFinalize(async (object, context) => {
    const path = `${object.name}`;

    // const filename = path.split('/').slice(-1);
    const filename = path.split('/').slice(-1).join();
    const directory = path.split('/').slice(0, -1).join();

    if (directory !== "upload" || !filename || !filename.endsWith(".apk")) {
        console.log("File ignored :", path);
        return Promise.resolve("ignore file");
    }

    return extractApk(directory, filename)
        .catch(reason => {
            console.error("Can't process file", reason);
            return admin.storage().bucket().file(path).delete()
        });
});

export const CLEAN_ARTIFACT = functions.firestore.document('applications/{appId}/versions/{versionId}/artifacts/{artifactId}')
    .onDelete((snapshot) => {
        const path = snapshot.get("path");
        console.log("remove file of " + snapshot.id, path);
        return admin.storage().bucket().file(path).delete()
    });


async function extractApk(directory: string, filename: string) {
    const fullPath = directory + '/' + filename;
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


    const appData = {
        flavor: flavor,
        appName: appName,
        package: manifest.package,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const artifactData = {
        package: manifest.package,
        path: newPath,
        flavor: flavor,
        buildType: buildType,
        type: type,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    } as Artifact;

    if (manifest.versionCode) {
        appData['versionCode'] = manifest.versionCode;
        artifactData['versionCode'] = manifest.versionCode;
    }
    if (manifest.versionName) {
        appData['versionName'] = manifest.versionName;
        artifactData['versionName'] = manifest.versionName;
    }

    const doc = admin.firestore().collection("applications").doc(appName).collection("versions").doc(uuid);
    try {
        await admin.storage().bucket().file(fullPath).move(newPath);
        await doc.set(appData, {merge: true});
        await doc.collection('artifacts').doc(filename.replace('.apk', '')).set(artifactData, {merge: false});
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
