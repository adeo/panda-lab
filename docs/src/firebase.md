---
layout: page
title: Deploy to firebase
nav_order: 8
permalink: /firebase/
---
# Firebase

PandaLab was developed around the [firebase solution](https://firebase.google.com/). The different services used are the following: 
* Authentification
* Cloud Firestore
* Cloud Storage
* Cloud Functions

## Authentification

Firebase Authentication will create different user and technical accounts : 
* mobile agent
* desktop agent
* users
    * admin
    * guest

## Cloud Firestore

Cloud Firestore is a flexible and scalable database. This one is used to store different exploited by the applications:
* User data
* Test job
* Reports
* List of phones
* ...

## Cloud Storage

Cloud Storage is a object storage service. This stores all the apk files, as well as the different Spoon reports.

## Cloud Functions

Cloud Functions for Firebase let you automatically run backend code in response to events triggered by Firebase features and HTTPS requests. Your code is stored in Google's cloud and runs in a managed environment. There's no need to manage and scale your own servers.

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