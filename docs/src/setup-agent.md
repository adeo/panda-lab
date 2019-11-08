---
layout: default
title: Setup agent
description: "Instruction to setup a PandaLab agent"
permalink: /setup-agent
nav_order: 4
---
# Setup an agent

An agent is a computer in charge of managing devices. Your instance of PandaLab can have as many agent as you want. 
Each of them will manage his connected devices.


## Setup environment

An agent need `adb` in order to control Android devices.
Please refer to the [Android developer documentation](https://developer.android.com/docs) to install `adb`.

Make sure adb is in your path by running :

```bash
adb --version
```

## Install client

Agent client is available in the agents section of your PandaLab web interface. Download the client of the corresponding OS.

![](assets/screenshots/agent-client.png)

Once install, you need to login the first time with an **admin** account. The agent will create his own technical account and logout
from yours. 

Then you will be able to manage your connected devices in the Agent section of the interface.

![](assets/screenshots/agent.png)


## Update client

The agent client still doesn't have auto update feature. You will have to repeat the install part each time you deploy a new version.

