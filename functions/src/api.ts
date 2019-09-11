import cors = require("cors");
import express = require("express");
import * as admin from "firebase-admin";
import {JobError, jobService} from "./services/job.service";
import {JobRequest} from "pandalab-commons";

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
        res.status(403).send()
    }
});


app.post('/job', async (req, res) => {
    console.log(req.body);
    const job = req.body as JobRequest;
    job.devices = job.devices || [];
    job.groups = job.groups || [];

    return jobService.createJob(job).then(value => {
        return res.send({
            jobId: value.id
        })
    }).catch(reason => {
        switch (reason) {
            case JobError.NO_DEVICE_FOUND:
            case JobError.TEST_APK_NOT_FOUND:
            case JobError.NOT_DEBUG:
                return res.status(400)
                    .send(
                        {error: reason}
                    );
            default:
                return res.status(500)
                    .send(
                        {error: reason}
                    );
        }
    });
});

app.use((err, req, res, next) => {
    res.status(404).send();
});

export const API_FUNCTION = functions.https.onRequest(app);
