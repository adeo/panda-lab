---
layout: default
title:  Create project
permalink: /create-project/
parent: Configure
nav_order: 1
---

# Firebase project

## Create a project
Open the Firebase console and click on the button **CREATE NEW PROJECT**.

![image](../assets/firebase/firebase-create-new-project.png)

Define the name of your project.

![image](../assets/firebase/firebase-create-new-project-name.png)

## Change firebase plan

In order to work properly, PandaLab needs a paid plan to enable all the platform's features. 
We recommend a **Blaze** formula to keep it free until you get a huge traffic on PandaLab.

![image](../assets/firebase/firebase-plan.png)

## Select your storage data center

Go to the storage section of your console and click on **Get started**.

![image](../assets/firebase/firebase-storage.png)

Select the data center you want and validate.

![image](../assets/firebase/firebase-storage-dc.png)

## Install Firebase cli

Download and install the [Firebase CLI](https://firebase.google.com/docs/cli)

Configure your credentials.
```bash
firebase login
```

## Clone and setup Pandalab

Clone the [Pandalab project](https://github.com/adeo/panda-lab) 
```bash
git clone https://github.com/adeo/panda-lab.git
cd panda-lab
```

Then define the Firebase project on which you will work :
```bash
firebase use [PROJECT ID]
```

