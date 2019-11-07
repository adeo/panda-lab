---
layout: default
title:  Android configuration
permalink: /android-config/
parent: Configure
nav_order: 4
---

# Android configuration

## Configure Keystore

Create a `signing-android.properties` file in `.config` and fulfill with your company signing data.

```properties
storeFile=/path/to/your/keystore/keystore.jks
keyAlias=my_alias
keyAliasPassword=XXXXXXXXXX
storePassword=XXXXXXXXX
```

## Create a firebase Android app

In the firebase settings create a new Android application with `com.leroymerlin.pandalab` as package name and download the `google-services.json`.

![image](/assets/firebase/firebase-config-web-create.png)


Set the path to the `google-services.json` in `.config/config.json` with the key **googlePlayServicesPath**.

```json
{
  "googlePlayServicesPath":".config/google-services.json"
}
```
