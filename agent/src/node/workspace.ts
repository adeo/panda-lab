import {HOME_DIR} from "@/services/remote";

const fs = require('fs');
const path = require('path');
const request = require('request');
// const progress = require('request-progress');

export class Workspace {

    private readonly homeDir: string;
    private readonly workspacepath: string;
    private readonly apkPath: string;

    constructor() {
        this.homeDir = HOME_DIR;
        this.workspacepath = `${this.homeDir}${path.sep}.pandalab`;
        this.apkPath = `${this.workspacepath}${path.sep}apk`;
    }

    private static mkdir(pathDir: string) {
        if (!fs.existsSync(pathDir)) {
            fs.mkdirSync(pathDir);
        }
    }

    prepare() {
        Workspace.mkdir(this.workspacepath);
        Workspace.mkdir(this.apkPath);
    }

    getJobDirectory(jobId: string): string {
        return `${this.apkPath}${path.sep}${jobId}`;
    }

    getReportJobDirectory(jobId: string, deviceId: string): string {
        return `${this.apkPath}${path.sep}${jobId}${path.sep}report${path.sep}${deviceId}`;
    }

    async downloadApk(jobId: string, url: string, filename: string): Promise<string> {
        const directory = this.getJobDirectory(jobId);
        Workspace.mkdir(directory);
        return new Promise((resolve, reject) => {
            const localFilePath = `${directory}${path.sep}${filename}`;
            if (fs.existsSync(localFilePath)) {
                // file already downloaded
                console.log(`File exist :  ${localFilePath}. Stop download apk.`);
                resolve(localFilePath);
                return;
            }

            const file = fs.createWriteStream(localFilePath);
            const https = require('https');
            console.log(url);
            https.get(url, res => {
                res.pipe(file);
                file.on('finish', function() {
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
