#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const resolve = require('path').resolve;


function copyDirectoryRecursiveSync(source, target) {
    if (!fs.lstatSync(source).isDirectory()) return;

    const operation = fs.copyFileSync;
    fs.readdirSync(source).forEach(function (itemName) {
        const sourcePath = path.join(source, itemName);
        const targetPath = path.join(target, itemName);

        if (fs.lstatSync(sourcePath).isDirectory()) {
            fs.mkdirSync(targetPath, {recursive: true});
            copyDirectoryRecursiveSync(sourcePath, targetPath);
        } else {
            operation(sourcePath, targetPath);
        }
    });
}

const targetPath = resolve('./dist_electron/src/protos');
const sourcePath = resolve('./node_modules/@google-cloud/firestore/build/protos');



if (!fs.existsSync(targetPath) || fs.readdirSync(targetPath).length === 0) {
    fs.mkdirSync(targetPath, {recursive: true});
    copyDirectoryRecursiveSync(sourcePath, targetPath)
}
