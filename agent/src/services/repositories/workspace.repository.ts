import {from, Observable} from "rxjs";

export class WorkspaceRepository {

    private readonly homeDir: string;
    private readonly workspacePath: string;
    private readonly apkPath: string;
    public readonly agentApkPath: string;
    public readonly spoonJarPath: string;

    fs = require('fs');
    path = require('path');
    request = require('request');

    constructor() {
        this.homeDir = require('os').homedir();
        this.fs = require('fs');
        this.path = require('path');
        this.request = require('request');

        this.workspacePath = `${this.homeDir}${this.path.sep}.pandalab`;
        this.apkPath = `${this.workspacePath}${this.path.sep}apk`;
        this.agentApkPath = `${this.workspacePath}${this.path.sep}panda-lab-mobile.apk`;
        this.spoonJarPath = `${this.workspacePath}${this.path.sep}spoon-runner.jar`;
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

    downloadFile(filePath: string, url: string): Observable<string> {
        return from(new Promise<string>((resolve, reject) => {
            if (this.fs.existsSync(filePath)) {
                // file already downloaded
                console.log(`File exist :  ${filePath}. Stop download apk.`);
                resolve(filePath);
                return;
            }

            const file = this.fs.createWriteStream(filePath);
            const https = require('https');
            console.log(url);
            https.get(url, res => {
                res.pipe(file);
                file.on('finish', function () {
                    console.log(`End download apk, path = ${filePath}`);
                    resolve(filePath);
                });
            }).on('error', function (err) {
                console.error(`Error download apk, path = ${filePath}`, err);
                reject(err);
            });
        }));
    }

    fileExist(file: string) {
        return this.fs.existsSync(file)
    }
}
