import {from, Observable, Subject} from "rxjs";
import {concatMap, filter, first, map} from "rxjs/operators";
import "rxjs-compat/add/operator/multicast";
import {doOnSubscribe} from "../../utils/rxjs";
import * as winston from "winston";
import {WriteStream} from "fs";


export class FilesRepository {

    private readonly homeDir: string;
    private readonly workspacePath: string;
    private readonly apkPath: string;
    public readonly agentApkPath: string;
    public readonly spoonJarPath: string;

    fs = require('fs');
    path = require('path');
    request = require('request');

    constructor(private logger: winston.Logger) {
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

    getJobDirectories(): string[] {
        let directory = `${this.apkPath}${this.path.sep}`;
        return this.fs.readdirSync(directory).filter(file => {
            return this.fs.statSync(directory + file).isDirectory();
        });
    }

    getJobDirectory(jobId: string, autoCreate: boolean = true): string {
        let directory = `${this.apkPath}${this.path.sep}${jobId}`;
        if (autoCreate) {
            this.mkdir(directory);
        }
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
                const file: WriteStream = this.fs.createWriteStream(data.filePath);
                const https = require('follow-redirects').https;
                console.log(data.url);


                https.get(data.url)
                    .on('response', res => {
                        console.log('response');
                        let downloaded = 0;
                        const length = parseInt(res.headers['content-length'], 10);
                        res.on('data', chunck => {
                            file.write(chunck);
                            downloaded += chunck.length;
                            this.logger.verbose(`Downloaded ${downloaded} / ${length}`);
                        })
                            .on('end', () => {
                                file.end();
                                this.logger.info(`End download, path = ${data.filePath}`);
                                resolve({filePath: data.filePath});
                            })
                            .on('error', err => {
                                // this.fs.unlinkSync(data.filePath);
                                this.logger.info(`Error download, path = ${data.filePath}`, err);
                                resolve({error: `Error download`, filePath: data.filePath});
                            });
                    });
                // https.get(data.url, res => {
                //     res.pipe(file);
                //     file.on('finish',  () => {
                //         file.close();
                //         this.logger.info(`End download, path = ${data.filePath}`);
                //         resolve({filePath: data.filePath});
                //     });
                // }).on('error', (err) => {
                //     this.fs.unlinkSync(data.filePath);
                //     this.logger.info(`Error download, path = ${data.filePath}`, err);
                //     resolve({error: `Error download`, filePath: data.filePath});
                // });
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

    fileExist(file: string): boolean {
        return this.fs.existsSync(file)
    }

    delete(path: string) {
        try {
            const rmdir = require('rmdir-recursive').sync;
            rmdir(path);
        } catch (e) {
            this.logger.error(e);
        }
    }
}


