#! /usr/bin/env node
var admin = require("firebase-admin");

const config = require("../../.config/config.json");
const serviceAccount = require((config.serviceAccountPath.startsWith("/") ? "" : "../../") + config.serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: config.storageBucket
});
const fs = require('fs');


function upload(source, target) {
    if (!fs.existsSync(source)) {
        console.warn(source + " does't exist. File ignored");
        return;
    }
    console.log(source + " upload started");
    return admin.storage().bucket().upload(source, {destination: target}).then(value => {
        console.log(source + " uploaded")
    }).catch(reason => {
        console.error("can't upload " + source, reason)
    });
}


const macPath = fs.readdirSync('./dist_electron').filter(fn => fn.endsWith('.dmg'))[0];
const windowsPath = fs.readdirSync('./dist_electron').filter(fn => fn.endsWith('.exe'))[0];
const linuxPath = fs.readdirSync('./dist_electron').filter(fn => fn.endsWith('.AppImage'))[0];

upload('./dist_electron/' + macPath, "config/mac-agent.dmg");
upload('./dist_electron/' + windowsPath, "config/windows-agent.exe");
upload('./dist_electron/' + linuxPath, "config/linux-agent.AppImage");
