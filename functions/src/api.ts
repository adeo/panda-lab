import cors = require("cors");
import express = require("express");
import * as admin from "firebase-admin";
import {JobStatus, TaskStatus} from "./models";

const functions = require('firebase-functions');
const app = express();
//const bodyParser = require('body-parser');
const morgan = require('morgan');


// Automatically allow cross-origin requests
app.use(cors({origin: true}));
//app.use(bodyParser);
app.use(morgan('combined'));


//verifyIdToken
app.use(async (req, res, next) => {
    try {
        if (req.headers["x-api-key"]) {
            const apiKey = req.headers["x-api-key"];
            const secrets = await admin.firestore().collection("config").doc("secrets").get();
            if (apiKey !== secrets.get("apiKey")) {
                throw new Error("Wrong api key")
            }
        } else if (req.headers["authorization"]) {
            const idToken = req.headers['authorization'].split('Bearer ')[1];
            await admin.auth().verifySessionCookie(idToken);
        } else {
            throw new Error("Missing authorization header")
        }
        next();
    } catch (e) {
        console.warn("Connection refused - ", e);
    }
});


app.post('/createJob', async (req, res) => {

    const artifact = req.body["artifact"];
    const groups = (req.body["groups"] || []) as string[];
    const devices = req.body["devices"] || [];


    //Check if artifact exist
    const artifactDoc = await admin.firestore().doc(artifact).get();
    if (!artifactDoc.exists || artifactDoc.get("type") !== "debug") {
        return res.status(400).send({
            message: 'artifact type has to be debug'
        })
    }

    //Check if artifact has test apk
    const artifactsCollection = artifactDoc.ref.parent;
    const artifactTestDocs = await artifactsCollection
        .where("type", "==", "test")
        .where("buildType", "==", artifactDoc.get("buildType"))
        .where("flavor", "==", artifactDoc.get("flavor")).limit(1).get();

    if (artifactTestDocs.empty) {
        return res.status(400).send({
            message: 'test artifact not found'
        })
    }
    const artifactTestDoc = artifactTestDocs.docs[0];


    //Check devices ids
    const devicesQuery = await Promise.all(groups.map(async (group: string) => {
        const result = await admin.firestore().collection("deviceGroups").doc(group).collection("devices").get();
        return result.docs.map(doc => doc.id)
    }));
    let devicesList = devicesQuery.reduce((prev, curr) => prev.concat(curr), []);
    devicesList = devicesList.concat(devices);

    const devicesSet = new Set<string>();
    devicesList.map(device => devicesSet.add(device));

    const finalDevices = await Promise.all(Array.from<string>(devicesSet.values()).filter(async deviceId => {
        const deviceDoc = await admin.firestore().collection("devices").doc(deviceId).get();
        return deviceDoc.exists
    }));

    if (finalDevices.length === 0) {
        return res.status(400).send({
            message: 'No device found'
        })
    }

    //Create job and tasks
    const job = await admin.firestore().collection('jobs').add({
        apk: artifactDoc.ref.path,
        apk_test: artifactTestDoc.ref.path,
        completed: false,
        status: JobStatus.pending
    });

    await Promise.all(finalDevices.map(
        async device => {
            const taskObj = {
                job: job.id,
                device: device,
                status: TaskStatus.pending,
            };
            return await admin.firestore().collection('jobs-tasks').add(taskObj);
        }
    ));

    return res.send({
        jobId: job.id
    })
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(404).send();
});
export const API_FUNCTION = functions.https.onRequest(app);
