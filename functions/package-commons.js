#! /usr/bin/env node

const fs = require('fs');
const {exec} = require('child_process');


var FOLDER_PATH = __dirname + '/packages';

if (!fs.existsSync("../commons")) {
    console.warn("firebase environment detected");
    return;
}


if (fs.existsSync(FOLDER_PATH)) {
    const files = fs.readdirSync(FOLDER_PATH);
    files.forEach(element => {
        fs.unlinkSync(FOLDER_PATH + "/" + element);
    });
} else {
    fs.mkdirSync(FOLDER_PATH)
}

exec('npm pack ../../commons', {cwd: FOLDER_PATH}, function (error, stdout, stderr) {
    console.log(stdout);
    console.error(stderr);
    exec('npm i pandalab-commons', function (error, stdout, stderr) {
        console.log(stdout);
        console.error(stderr);
    });
});



