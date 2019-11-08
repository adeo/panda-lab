---
layout: default
title:  Identity providers
permalink: /identity-providers/
parent: Configure
nav_order: 4
---

# Identity providers

Firebase Authentication allows you to connect to multiple providers :

* google.com (OAuth Google)
* password (Email)
* facebook.com (OAuth Facebook)
* github.com (OAuth Github)
* twitter.com (OAuth twitter)

![image](/assets/firebase/pandalab-login-providers.png)

--- 

## Configure the list of providers

The different providers are configurable in the file`.config/config.json` : 

```json
{
 // ...
 "authProviders": [
     "google.com",
     "password",
     "facebook.com",
     "github.com",
     "twitter.com"
 ]
}
```

The `authProviders` property is an array with the different providers you want. You are free to use the providers you need.

Don't forget to configure each of them in the Firebase console.

![image](/assets/firebase/firebase-providers.png)


The configuration of the different providers in firebase is available on the [official documentation](https://firebase.google.com/docs/auth)
