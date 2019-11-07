---
layout: default
title:  Web configuration
permalink: /web-config/
parent: Configure
nav_order: 2
---

# Web configuration

## Create an web app

In the firebase settings create a new web application.

![image](/assets/firebase/firebase-config-web-create.png)

Retrieve information from the configured web application.

![image](/assets/firebase/firebase-config-web-created.png)


## Configure firebase.json

Modify or create the file `.config/firebase.json` located at the root of the project to add the previous information :

```javascript
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

**serviceAccountPath** is the Firebase Admin SDK file created from the console. To create this file please follow the documentation : [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

--- 
**projectId**, **apiKey**, **messagingSender** are available directly in the settings screen of the Firebase console.

![image](/assets/firebase/firebase-config-web-create.png)

The following information will need to be added to the file `.config/firebase.json` : 

![image](/assets/firebase/firebase-config-web-created.png)



