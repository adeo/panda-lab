---
layout: default
title:  Web configuration
permalink: /web-config/
parent: Configure
nav_order: 2
---

# Web configuration

## Create a web app

In the firebase settings create a new web application.

![image](../assets/firebase/firebase-config-web-create.png)

Retrieve informations from the configured web application.

![image](../assets/firebase/firebase-config-web-created.png)


## Configure firebase.json

Modify or create the file `.config/config.json` located at the root of the project to add the previous information :

```json
{
 "apiKey": "AIzaSyB-LYCs9okzeQFQbhi3XXXXXXXXXXX",
 "authDomain": "panda-lab-lm.firebaseapp.com",
 "databaseUrl": "https://panda-lab-lm.firebaseio.com",
 "projectId": "panda-lab-lm",
 "storageBucket": "panda-lab-lm.appspot.com",
 "messagingSenderId": "248XXXXXXX",
 "appId": "1:2433243323:web:deXXXXXXXX",
}
```

## Service account

Create a service account and download the json file from the firebase settings or the google cloud console.
To create this file, please follow the documentation : [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup).

Put the file in the `.config` folder and add **serviceAccountPath** to the `.config/config.json` file to set the service account json file path.

```json
{
 "serviceAccountPath": ".config/firebase-adminsdk.json"
}
```

## Api endpoint

The rest api endpoint url can be found in the functions part of the firebase console if you already deployed them. 
If it's your first deployment, you can create it with this pattern `https://{datacenter}-{projectName}.cloudfunctions.net`

If not are not sure about your datacenter you can run :
```bash
npm install
npm run deploy --prefix functions
```
Then you will have access to your cloud functions url in the functions section of your firebase console.

Add **apiUrl** in the `.config/config.json` file.
```json
{
 "apiUrl": "https://us-central1-panda-lab-lm.cloudfunctions.net"
}
```
