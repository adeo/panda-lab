---
layout: default
title: Install
nav_order: 3
description: "How to deploy PandaLab to firebase"
permalink: /install
---

# Install
{: .fs-9 }

Make sure you follow all the steps in the configure section before trying to deploy.
{: .fs-6 .fw-300 }

[Configure project](/configure){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } 

---

## Deploy

Run the following command in the root folder to deploy the project to firebase
```bash
npm run deploy
```

## Update

To update the project you just have to pull and deploy.

```bash
git pull
npm run deploy
```

## Install Agent

To install an agent go to the admin section of your deployed website and download the corresponding agent client.
