---
layout: default
title:  Identity providers
permalink: /identity-providers/
parent: Configure
nav_order: 4
---

# Firebase project

## Create a project
Open the Firebase console and click on the button "CREATE NEW PROJECT" : 

![image](/assets/firebase/firebase-create-new-project.png)

Define the name of your project :

![image](/assets/firebase/firebase-create-new-project-name.png)

Download and install the [Firebase CLI](https://firebase.google.com/docs/cli) 
Configure your credentials :
```bash
firebase login
```

## Change firebase plan

In order to work properly PandaLab need paid plan to enable all the features of the platform. 
We recommend a Blaze formula to keep it free until you have a huge traffic on PandaLab.

![image](/assets/firebase/firebase-plan.png)


## Clone and setup Pandalab

Clone the [Pandalab project](https://github.com/MobileTribe/panda-lab) 
```bash
git clone https://github.com/MobileTribe/panda-lab.git
cd panda-lab
```

Then define the Firebase project on which you will work :
```bash
firebase use [PROJECT NAME]
```


#### Security

_The first user created in the application will be automatically admin. Then the following will be identified as a guest until the administrator grants rights greater than this one._

![image](/assets/screenshots/security.png)

## Configure Firebase



## Configure PandaLab

Modify the file `.config/firebase.json` located at the root of the project :

```javascript
{
 "serviceAccountPath": ".config/firebase-adminsdk.json",
 "googlePlayServicesPath": ".config/google-play-services.json",
 "storageBucket": "panda-lab-lm.appspot.com",
 "projectId": "panda-lab-lm",
 "apiKey": "AIzaSyB-LYCs9okzeQFQbhi3XXXXXXXXXXX"
 "messagingSender": "248XXXXXXX",
 "apiUrl": "https://us-central1-panda-lab-lm.cloudfunctions.net",
 "databaseUrl": "https://panda-lab-lm.firebaseio.com",
 "authDomain": "panda-lab-lm.firebaseapp.com",
}
```

**serviceAccountPath** is the Firebase Admin SDK file created from the console. To create this file please follow the documentation : [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

--- 
**projectId**, **apiKey**, **messagingSender** are available directly in the settings screen of the Firebase console.

![image](/assets/firebase/firebase-config-web-create.png)

The following information will need to be added to the file `.config/firebase.json` : 

![image](/assets/firebase/firebase-config-web-created.png)



