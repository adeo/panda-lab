import {AsyncSubject, BehaviorSubject, from, Observable, Subject} from "rxjs";
import {concatMap, filter, first, map} from "rxjs/operators";
import "rxjs-compat/add/operator/multicast";
import {doOnSubscribe} from "../../utils/rxjs";
import * as winston from "winston";



export class FilesRepository {

    private readonly homeDir: string;
    private readonly workspacePath: string;
    private readonly apkPath: string;
    public readonly agentApkPath: string;
    public readonly spoonJarPath: string;

    fs = require('fs');
    path = require('path');
    request = require('request');

    constructor(private logger : winston.Logger) {
        this.homeDir = require('os').homedir();
        this.fs = require('fs');
        this.path = require('path');
        this.request = require('request');

        this.workspacePath = `${this.homeDir}${this.path.sep}.pandalab`;
        this.apkPath = `${this.workspacePath}${this.path.sep}apk`;
        this.agentApkPath = `${this.workspacePath}${this.path.sep}panda-lab-mobile.apk`;
        this.spoonJarPath = `${this.workspacePath}${this.path.sep}spoon-runner.jar`;

        this.prepare();
    }

    private mkdir(pathDir: string) {
        if (!this.fs.existsSync(pathDir)) {
            this.fs.mkdirSync(pathDir, {recursive: true});
        }
    }

    prepare() {
        this.mkdir(this.workspacePath);
        this.mkdir(this.apkPath);
    }

    getApkDirectory(): string {
        return this.apkPath;
    }

    getJobDirectory(jobId: string): string {
        let directory = `${this.apkPath}${this.path.sep}${jobId}`;
        this.mkdir(directory);
        return directory;
    }

    getReportJobDirectory(jobId: string, deviceId: string): string {
        let directory = `${this.apkPath}${this.path.sep}${jobId}${this.path.sep}report${this.path.sep}${deviceId}`;
        this.mkdir(directory);
        return directory;
    }

    private downloadSubjectEmitter = new Subject<{ url: string, filePath: string }>();

    private downloadSubjectReceiver = new Subject<{ error?: string, filePath: string }>();

    private sub = this.downloadSubjectEmitter.pipe(
        concatMap(data => {
            return from(new Promise<{ error?: string, filePath: string }>((resolve, reject) => {
                if (this.fs.existsSync(data.filePath)) {
                    // file already downloaded
                    this.logger.info(`File exist :  ${data.filePath}. Stop download apk.`);
                    resolve({filePath: data.filePath});
                    return;
                }

                this.prepare();
                this.logger.info(`Start downloading file, path = ${data.url}`);
                const file = this.fs.createWriteStream(data.filePath);
                const https = require('https');
                console.log(data.url);
                https.get(data.url, res => {
                    res.pipe(file);
                    file.on('finish',  () => {
                        this.logger.info(`End download apk, path = ${data.filePath}`);
                        resolve({filePath: data.filePath});
                    });
                }).on('error', (err) => {
                    this.logger.info(`Error download apk, path = ${data.filePath}`, err);
                    resolve({error: `Error download apk`, filePath: data.filePath});
                });
            }))
        })).subscribe(this.downloadSubjectReceiver);

    downloadFile(filePath: string, url: string): Observable<string> {
        return this.downloadSubjectReceiver.pipe(
            doOnSubscribe(() => {
                this.downloadSubjectEmitter.next({url: url, filePath: filePath})
            }),
            filter(result => result.filePath === filePath),
            first(),
            map(result => {
                if (result.error) {
                    throw result.error
                }
                return result.filePath
            })
        );
    }

    fileExist(file: string) {
        return this.fs.existsSync(file)
    }

    delete(path: string) {
        if (this.fileExist(path)) {
            this.fs.unlinkSync(path)
        }
    }
}


