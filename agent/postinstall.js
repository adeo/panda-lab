#! /usr/bin/env node

const fs = require('fs');

//FIX adbkit wrong path with webpack

const packagesPatch = [
    {
        file: './node_modules/adbkit',
        module: './lib/adb'
    },
    {
        file: './node_modules/adbkit-logcat',
        module: './lib/logcat'
    },
    {
        file: './node_modules/adbkit-monkey',
        module: './lib/monkey'
    }
];


packagesPatch.forEach(
    patch => {
        const packageJson = require(patch.file + '/package.json');
        packageJson.module = patch.module;
        fs.writeFileSync(patch.file + '/package.json', JSON.stringify(packageJson));
    }
);

