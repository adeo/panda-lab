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
    const directory = path.split('/').slice(0, -1).join('/');
    // Get all files in directory
    const files = (await admin.storage().bucket().getFiles({
        directory: directory
    }));

    // Exclude directory name
    const apks: File[] = files[0].filter(value => value.name.endsWith('.apk'));
    if (apks.length !== 3) {
        console.log("File ignored :", path);
        return Promise.reject(`Directory : ${directory} not contain 3 apk files`);
    }

    const promises = apks
        .map(apk => apk.name.split('/').slice(-1)) // extract filename
        .map(filename => extractApk(directory, filename[0]));

    return Promise.all(promises)
        .catch(reason => {
            console.error("Can't process", reason);
        });
});

async function extractApk(directory: string, filename: string) {
    const fullPath = directory + '/' + filename;
    const part = filename.replace('.apk', '').split('_');
    const appName = part[0];
    const uuid = part[1];
    const versionName = part[2];
    const versionType = part[3];

    const response = await admin.storage().bucket().file(fullPath).download();
    const reader = await ApkReaderFromBuffer.open(response[0]);
    const manifest = await reader.readManifest();
    console.log(util.inspect(manifest, {depth: null}));
    const newData = {
        appName,
        uuid,
        versionName
    };

    newData[versionType] = {
        package: manifest.package,
        type: versionType,
    };

    if (manifest.versionCode) {
        newData[versionType].versionCode = manifest.versionCode
    }
    if (manifest.versionName) {
        newData[versionType].versionName = manifest.versionName
    }
    const newPath = "applications/" + appName + "/" + filename;

    await admin.storage().bucket().file(fullPath).move(newPath);

    const doc = admin.firestore().collection("applications").doc(appName).collection("versions").doc(uuid);
    return doc.set(newData, {merge: true});
}
