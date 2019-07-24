import {DocumentData, DocumentReference, DocumentSnapshot} from '@google-cloud/firestore';
import * as path from 'path';
import {Device, FirebaseModel, Job, JobTask} from './models';
import {Workspace} from './workspace';
import {asyncForEach, Mutex} from './utils';
import {getDeviceUUID} from './adb';
import {parseSpoon, Spoon} from './spoon';
import {UUID} from '../src/services/remote';

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const adbkit = require('adbkit');

const admin = require('firebase-admin');
const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(require(`${__dirname}/../panda-lab-lm-firebase-adminsdk.json`)),
    databaseURL: 'https://panda-lab-lm.firebaseio.com',
});

export class JobSchedulers {

    private readonly workspace: Workspace;
    private tasks: JobTask[] = [];
    private tasksMutex = new Mutex();

    constructor(workspace: Workspace) {
        this.workspace = workspace;
    }

    private static async getReference<T extends FirebaseModel>(document: DocumentData, key: string, map: (obj: any) => T): Promise<T> {
        const ref: DocumentReference = document[key];
        const subRef: DocumentSnapshot = await ref.get();
        const value = subRef.data();
        const firebaseModel = map(value);
        firebaseModel._id = subRef.ref.id;
        firebaseModel._path = subRef.ref.path;
        return firebaseModel;
    }

    async watch() {
        const uuid = UUID;
        firebaseApp.firestore().collection('jobs-tasks')
            .where('status', '==', 'pending')
            .onSnapshot(async snapshot => {
                this.tasks = this.tasks.filter(value => !value.finish);
                const unlock = await this.tasksMutex.lock();
                const promises: Promise<JobTask>[] = snapshot.docs.map(document => {
                    return this.getJobTask(document);
                });
                const results = await Promise.all(promises);
                const resultsFiltered = results
                    .filter(job => {
                        return firebaseApp.firestore().collection('agents').doc(uuid).isEqual(job.device.agent);
                    })
                    .filter(job => {
                        const index = this.tasks.findIndex(value => value._id === job._id);
                        console.log(`${job._id} : $index = ${index}`);
                        return index === -1;
                    });

                if (resultsFiltered.length === 0) {
                    unlock();
                    return;
                }

                await firebaseApp.firestore().runTransaction(async (transaction) => {
                    try {
                        resultsFiltered.forEach(task => {
                            transaction.update(task.ref, {status: 'installing'});
                        });
                        this.tasks.push(...resultsFiltered);
                    } catch (e) {
                        console.error(e);
                    } finally {
                        unlock();
                    }
                    try {
                        this.perform();
                    } catch (e) {
                        console.log('Perform apk error', e);
                    }
                });
            });
    }

    private async getJobTask(documentSnapshot: DocumentSnapshot): Promise<JobTask> {
        const documentData: DocumentData = documentSnapshot.data();
        const device: Device = await JobSchedulers.getReference<Device>(documentData, 'device', (obj: any) => {
            return <Device>{
                ip: obj.ip,
                name: obj.name,
                serialId: obj.serialId,
                phoneModel: obj.phoneModel,
                agent: obj.agent
            };
        });
        const job: Job = await JobSchedulers.getReference<Job>(documentData, 'job', (obj: any) => {
            return <Job>{
                apkDebug: obj.apk,
                apkTest: obj.apk_test,
                apkRelease: obj.apk_release,
            };
        });

        return <JobTask>{
            _id: documentSnapshot.ref.id,
            _path: documentSnapshot.ref.path,
            device,
            job,
            status: documentData.status,
            finish: false,
            ref: documentSnapshot.ref,
        };
    }

    private async perform() {
        if (this.tasks.length === 0) {
            // do nothing
            return;
        }

        const adbClient = adbkit.createClient();
        const devices = await adbClient.listDevices();
        const devicesUUID = [];

        await asyncForEach(devices, async device => {
            const uuid = await getDeviceUUID(adbClient, device.id);
            devicesUUID.push({
                serial: device.id,
                id: uuid,
            });
        });


        console.log(`start perform`);
        await asyncForEach(this.tasks, async (task: JobTask) => {
            const jobId = task._id;
            const {apkDebug, apkRelease, apkTest} = task.job;
            const deviceId = task.device._id;
            const logcatConfiguration = devicesUUID.find(value => value.id === deviceId);
            if (!logcatConfiguration) {
                task.finish = true;
                task.ref.set({status: 'error'}, {merge: true});
                console.log(`Skip the device ${deviceId} is not connected`);
                return;
            }
            const serial = logcatConfiguration.serial;
            console.log(`Start download apk for job : ${jobId}`);
            const fileDebug = await this.downloadApk(jobId, apkDebug);
            const androidSDK = process.env.ANDROID_HOME;
            const fileTest = await this.downloadApk(jobId, apkTest);
            task.finish = true;
            task.ref.set({status: 'running'}, {merge: true});
            const reportDirectory = this.workspace.getReportJobDirectory(jobId, deviceId);
            const spoonCommands = [
                `java -jar jar/spoon-runner.jar`,
                `--apk ${fileDebug}`,
                `--test-apk ${fileTest}`,
                `--sdk ${androidSDK}`,
                `--output ${reportDirectory}`,
                `-serial ${serial}`,
            ];
            const cmd = spoonCommands.join(' ');
            console.log(`Run : ${cmd}`);
            // Executing instrumentation suite on 0 device(s)
            const {stdout, stderr} = await exec(cmd);
            console.log('stdout:', stdout);
            console.log('stderr:', stderr);
            console.log(`End download apk for job : ${jobId}`);
            const spoon: Spoon = parseSpoon(`${reportDirectory}/result.json`);
            task.ref.set({status: 'finish', result: spoon}, {merge: true});
        });
        console.log(`End perform`);
    }

    private async downloadApk(jobId: string, filePath: string): Promise<string> {
        const bucket = firebaseApp.storage().bucket('panda-lab-lm.appspot.com');
        const readStream = bucket.file(filePath).createReadStream();
        const filename = filePath.split('/').slice(-1)[0];
        return this.workspace.downloadApk(jobId, readStream, filename);
    }


}
