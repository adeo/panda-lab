#! /usr/bin/env node

const fs = require('fs');

//FIX adbkit wrong path with webpack

const packagesPatch = [
    {
        file: './node_modules/adbkit',
        main: './lib/adb'
    },
    {
        file: './node_modules/adbkit-logcat',
        main: './lib/logcat'
    },
    {
        file: './node_modules/adbkit-monkey',
        main: './lib/monkey'
    }
];


packagesPatch.forEach(
    patch => {
        const packageJson = require(patch.file + '/package.json');
        packageJson.main = patch.main;
        packageJson.module = patch.main;
        fs.writeFileSync(patch.file + '/package.json', JSON.stringify(packageJson));
    }
);

