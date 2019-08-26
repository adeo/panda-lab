export class Workspace {

    private readonly homeDir: string;
    private readonly workspacepath: string;
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

        this.workspacepath = `${this.homeDir}${this.path.sep}.pandalab`;
        this.apkPath = `${this.workspacepath}${this.path.sep}apk`;
        this.agentApkPath = `${this.workspacepath}${this.path.sep}panda-lab-mobile.apk`;
        this.spoonJarPath = `${this.workspacepath}${this.path.sep}spoon-runner.jar`;
    }

    private mkdir(pathDir: string) {
        if (!this.fs.existsSync(pathDir)) {
            this.fs.mkdirSync(pathDir);
        }
    }

    prepare() {
        this.mkdir(this.workspacepath);
        this.mkdir(this.apkPath);
    }

    getJobDirectory(jobId: string): string {
        return `${this.apkPath}${this.path.sep}${jobId}`;
    }

    getReportJobDirectory(jobId: string, deviceId: string): string {
        return `${this.apkPath}${this.path.sep}${jobId}${this.path.sep}report${this.path.sep}${deviceId}`;
    }

    getPandaLabMobileApk(): string {
        const pandaLabMobileApk = `${this.workspacepath}${this.path.sep}panda-lab-mobile.apk`;
        if (!this.fs.existsSync(pandaLabMobileApk)) {
            // TODO DOWNLOAD
            console.log(`AGENT MOBILE not exist in ${pandaLabMobileApk}`);
        } else {
            console.log(`AGENT MOBILE exist in ${pandaLabMobileApk}`);
        }
        return pandaLabMobileApk;
    }

    async downloadApk(jobId: string, url: string, filename: string): Promise<string> {
        const directory = this.getJobDirectory(jobId);
        this.mkdir(directory);
        return new Promise((resolve, reject) => {
            const localFilePath = `${directory}${this.path.sep}${filename}`;
            if (this.fs.existsSync(localFilePath)) {
                // file already downloaded
                console.log(`File exist :  ${localFilePath}. Stop download apk.`);
                resolve(localFilePath);
                return;
            }

            const file = this.fs.createWriteStream(localFilePath);
            const https = require('https');
            console.log(url);
            https.get(url, res => {
                res.pipe(file);
                file.on('finish', function () {
                    console.log(`End download apk, path = ${localFilePath}`);
                    resolve(localFilePath);
                });
            }).on('error', function (err) {
                console.error(`Error download apk, path = ${localFilePath}`, err);
                reject(err);
            });

        });
    }

}

export const workspace = new Workspace();
