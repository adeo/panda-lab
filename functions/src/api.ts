import cors = require("cors");
import express = require("express");
import {JobError, jobService} from "./services/job.service";
import {JobRequest} from "pandalab-commons";
import {securityService} from "./services/security.service";

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
        await securityService.checkApiRequest(req);
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

export const CREATE_JOB = functions.https.onCall(async (data, context) => {
    console.log(`CALL createJob`);
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", `Not authorized to create a job`);
    }
    const job: JobRequest = data as JobRequest;
    console.log(`jobRequest = `, job);
    job.devices = job.devices || [];
    job.groups = job.groups || [];
    const value = await jobService.createJob(job);
    return {
        jobId: value.id,
    }
});

app.use((err, req, res, next) => {
    res.status(404).send();
});

export const API_FUNCTION = functions.https.onRequest(app);
