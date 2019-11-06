---
layout: default
title: Configure Firebase
permalink: /firebase/
parent: Configure
nav_order: 1
---

# Configure Firebase

PandaLab was developed around the [firebase solution](https://firebase.google.com/). The different services used are the following: 
* Authentification
* Cloud Firestore
* Cloud Storage
* Cloud Functions

![image](/assets/firebase.png)

---

### Authentification

Firebase Authentication will create different user and technical accounts : 
* guest
* user
* admin

---

#### Security

_The first user created in the application will be automatically admin. Then the following will be identified as a guest until the administrator grants rights greater than this one._

![image](/assets/screenshots/security.png)

--- 
### Cloud Firestore

Cloud Firestore is a flexible and scalable database. This one is used to store different exploited by the applications:
* User data
* Test job
* Reports
* List of phones
* ...

---
### Cloud Storage

Cloud Storage is a object storage service. This stores all the apk files, as well as the different Spoon reports.

---
### Cloud Functions

Cloud Functions for Firebase let you automatically run backend code in response to events triggered by Firebase features and HTTPS requests. Your code is stored in Google's cloud and runs in a managed environment. There's no need to manage and scale your own servers.

---
## Configure Firebase

### Creating a project

Open the Firebase console and click on the button "CREATE NEW PROJECT" : 

![image](/assets/firebase-create-new-project.png)

Define the name of your project :

![image](/assets/firebase-create-new-project-name.png)

Download the [Firebase CLI](https://firebase.google.com/docs/cli) and configure your credentials : 

```bash
firebase login
```

Then define the Firebase project on which you will work :

```bash
firebase use [PROJECT NAME]
```

Clone the [Pandalab project](https://github.com/MobileTribe/panda-lab) and run this command in root folder : 
```bash
firebase deploy
```


Then you had to have a set of deployed functions: 

![image](/assets/firebase-functions.png)

Then you had to have a set of deployed functions. If so, the configuration of your project is complete.


## Configure PandaLab

Modify the file `.config/firebase.json` located at the root of the project :

```javascript
{
 "serviceAccountPath": ".config/firebase-adminsdk.json",
 "googlePlayServicesPath": ".config/google-play-services.json",
 "storageBucket": "panda-lab-lm.appspot.com",
 "projectId": "panda-lab-lm",
 "apiKey": "AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0"
 "messagingSender": "24857120470",
 "apiUrl": "https://us-central1-panda-lab-lm.cloudfunctions.net",
 "databaseUrl": "https://panda-lab-lm.firebaseio.com",
 "authDomain": "panda-lab-lm.firebaseapp.com",
}
```

**serviceAccountPath** is the Firebase Admin SDK file created from the console. To create this file please follow the documentation : [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

--- 
**projectId**, **apiKey**, **messagingSender** are available directly in the settings screen of the Firebase console.

![image](/assets/screenshots/firebase-config-web-create.png)

The following information will need to be added to the file `.config/firebase.json` : 

![image](/assets/screenshots/firebase-config-web-created.png)



