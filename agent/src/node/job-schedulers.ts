import * as path from 'path';
import {Device, FirebaseModel, Job, JobTask} from './models';
import {workspace} from './workspace';
import {asyncForEach, Mutex} from './utils';
import {getDeviceUUID} from './adb';
import {parseSpoon, Spoon} from './spoon';
import * as firebase from 'firebase';
import {adb, ANDROID_HOME, HOME_DIR, UUID} from '@/services/remote';
import {firebaseService, FIRESTORE, STORAGE} from "@/services/firebase.service";
import DocumentData = firebase.firestore.DocumentData;
import DocumentReference = firebase.firestore.DocumentReference;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

const util = require('util');
const exec = util.promisify(require('child_process').exec);

class JobSchedulers {

    private tasks: JobTask[] = [];
    private tasksMutex = new Mutex();
    private readonly adbClient: any;
f
    constructor() {
        this.adbClient = adb;
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

    private cancelWatcher: () => void;

    watch() {
        firebase.auth().onAuthStateChanged(user => {
            console.log(`onAuthStateChanged, user = ${user}`);
            this.cancelWatchIfNeeded();
            if (user !== null) {
                this.cancelWatcher = firebaseService.registerJobsTaks(async snapshot => {
                    console.log(`Jobs tasks in pending`);
                    this.tasks = this.tasks.filter(value => !value.finish);
                    const unlock = await this.tasksMutex.lock();
                    const promises: Promise<JobTask>[] = snapshot.docs.map(document => {
                        return this.getJobTask(document);
                    });
                    const jobTasks = this.filterJobTasks(await Promise.all(promises));
                    console.log(`Jobs tasks in pending ${jobTasks.length}`);
                    if (jobTasks.length === 0) {
                        unlock();
                        return;
                    }
                    await this.installing(jobTasks, unlock);
                });
            }
        });
    }

    private cancelWatchIfNeeded() {
        if (this.cancelWatcher) {
            this.cancelWatcher();
        }
    }

    private filterJobTasks(jobTasks: JobTask[]) {
        return jobTasks
            .filter(job => {
                console.log(job);
                return FIRESTORE.collection('agents').doc(UUID).isEqual(job.device.agent);
            })
            .filter(job => {
                const index = this.tasks.findIndex(value => value._id === job._id);
                console.log(`${job._id} : $index = ${index}`);
                return index === -1;
            });
    }

    private async installing(jobTasks: JobTask[], unlock: Function) {
        await FIRESTORE.runTransaction(async (transaction) => {
            try {
                jobTasks.forEach(task => {
                    transaction.update(task.ref, {status: 'installing'});
                });
                this.tasks.push(...jobTasks);
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

        const devices = await this.adbClient.listDevices();
        const devicesUUID = [];

        await asyncForEach(devices, async device => {
            const uuid = await getDeviceUUID(this.adbClient, device.id);
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
            const fileTest = await this.downloadApk(jobId, apkTest);
            task.finish = true;
            task.ref.set({status: 'running'}, {merge: true});
            const reportDirectory = workspace.getReportJobDirectory(jobId, deviceId);

            const spoonCommands = [
                `java -jar ${workspace.spoonJarPath}`,
                `--apk ${fileDebug}`,
                `--test-apk ${fileTest}`,
                `--sdk ${ANDROID_HOME}`,
                `--output ${reportDirectory}`,
                `-serial ${serial}`,
            ];
            const cmd = spoonCommands.join(' ');
            console.log(`Run : ${cmd}`);
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
        const filename = STORAGE.ref(filePath).name;
        const url = await STORAGE.ref(filePath).getDownloadURL();
        return workspace.downloadApk(jobId, url, filename);
    }


}

export const jobSchedulers = new JobSchedulers();
