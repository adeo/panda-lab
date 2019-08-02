import * as functions from 'firebase-functions';
import * as util from "util";

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
    };

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


