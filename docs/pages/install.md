---
layout: default
title: Install
nav_order: 3
description: "How to deploy PandaLab to firebase"
permalink: /install
---

# Install
{: .fs-9 }

Make sure you have followed all the steps in the configure section before trying to deploy.
{: .fs-6 .fw-300 }

[Configure project](configure){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } 

Pandalab install have been tested on MacOs and Windows with node version 10.+ and 12.+.

## Known issues
- Using node 13.+ to build may crash
- Building windows agent on mac catalina fail (https://github.com/electron/electron-packager/issues/1055)
- Building linux agent on windows fail (https://github.com/electron/electron/issues/2079)

---

## Agent build targets

You can choose the agent build targets os you need to build in `.config/config.json` with **agentBuildTargets**.
Available target are mac (m), linux (l) and windows (w). By default it will only build for the hosting os.

```json
{
   "agentBuildTargets": "mlw"
}
```

## Deploy

Run the following command in the root folder to deploy the project to firebase
```bash
npm install
npm run deploy
```

## Update

To update the project you just have to pull and deploy.

```bash
git pull
npm install
npm run deploy
```

## Install Agent

To install an agent, go to the admin section of your deployed website and download the corresponding agent client.
