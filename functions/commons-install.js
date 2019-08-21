#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');


var FOLDER_PATH = __dirname + '/packages';


if (fs.existsSync(FOLDER_PATH)) {
    var files = fs.readdirSync(FOLDER_PATH);
    files.forEach(element => {
        fs.unlinkSync(FOLDER_PATH + "/" + element);
    });
} else {
    fs.mkdirSync(FOLDER_PATH)
}


exec('npm pack ../../commons', {cwd: FOLDER_PATH}, function (error, stdout, stderr) {
    console.log(stdout);
});
