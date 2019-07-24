# Panda Lab

## Agent

|Command|Description|
|--|--|
|`npm start`| Execute the app in the dev mode (debug port 9222) |
|`npm run build`| Builds your application and start electron |

**Configuration to Debug in intellij**

Configuration > Attach to Node.js/Chrome
- localhost
- Use port 9222


## Deploy on Firebase

Here are the commands to launch to deploy on Firebase

### Firestore rules
```shell
firebase deploy --only firestore:rules
```

### Functions
```shell
firebase deploy --only functions
```
#### Configuration

### Login

```shell
firebase login
```

### Choice your firebase project

```shell
firebase use <your project name>
```
