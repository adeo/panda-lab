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

## Install Firebase cli

Download and install the [Firebase CLI](https://firebase.google.com/docs/cli)

Configure your credentials.
```bash
firebase login
```

## Clone and setup Pandalab

Clone the [Pandalab project](https://github.com/MobileTribe/panda-lab) 
```bash
git clone https://github.com/MobileTribe/panda-lab.git
cd panda-lab
```

Then define the Firebase project on which you will work :
```bash
firebase use [PROJECT ID]
```

