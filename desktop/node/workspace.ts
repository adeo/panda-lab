import {Readable} from 'stream';

const fs = require('fs');
const path = require('path');
// const request = require('request');
// const progress = require('request-progress');

export class Workspace {

  private readonly homeDir: string;
  private readonly workspacepath: string;
  private readonly apkPath: string;

  constructor() {
    this.homeDir = require('os').homedir();
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

  async downloadApk(jobId: string, file: Readable, filename: string): Promise<string> {
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

      console.log(`File not exist :  ${localFilePath}. Start download apk`);
      file
        .pipe(fs.createWriteStream(localFilePath))
        .on('error', function (err) {
          console.error(`Error download apk, path = ${localFilePath}`, err);
          reject(err);
        })
        .on('finish', function () {
          console.error(`End download apk, path = ${localFilePath}`);
          resolve(localFilePath);
        })
      ;
    });
  }

}
