const envfile = require('envfile');

const config = require("../../.config/config.json");

const apiKey = config.apiKey;
const authDomain = config.authDomain;
const projectId = config.projectId;
const databaseUrl = config.databaseUrl;
const messagingSenderId = config.messagingSenderId;
const storageBucket = config.storageBucket;
const apiUrl = config.apiUrl;
const authProviders = config.authProviders;

const env = envfile.stringifySync({
    VUE_APP_API_KEY: apiKey,
    VUE_APP_AUTH_DOMAIN: authDomain,
    VUE_APP_PROJECT_ID: projectId,
    VUE_APP_DATABASE_URL: databaseUrl,
    VUE_APP_MESSAGING_SENDER_ID: messagingSenderId,
    VUE_APP_STORAGE_BUCKET: storageBucket,
    VUE_APP_API_URL: apiUrl,
    VUE_APP_AUTH_PROVIDERS: authProviders
});

const fs = require('fs');

fs.writeFile(__dirname + "/../.env", env, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log(".env generated");
});
