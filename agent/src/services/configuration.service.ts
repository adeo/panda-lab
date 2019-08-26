import {authentService} from "@/services/authent.service";
import {Observable, of} from "rxjs";
import {workspace} from "@/node/workspace";
import * as firebase from 'firebase';
import "rxjs-compat/add/operator/delay";
import "rxjs-compat/add/operator/concat";

const fs = require('fs');

export class ConfigurationService {

    public configure() {
        return of('Start configuration')
            .concat(
                this.configureAgentToken().map(() => "Agent token configured 1/3"),
                this.configureMobileApk().map(() => "Agent mobile downloaded 2/3"),
                this.configureSpoonJar().map(() => "Spoon jar downloaded 3/3")
            );
    }

    public configureAgentToken(): Observable<string> {
        return new Observable<string>(subscriber => {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    subscriber.next();
                    subscriber.complete();
                }
                authentService.createAgentToken().subscribe(subscriber);
            });
        });
    }

    public configureMobileApk() {
        const agentApkPath = workspace.agentApkPath;
        if (!fs.existsSync(agentApkPath)) {
            console.log(`${agentApkPath} not exist`);
            return new Observable<string>(subscriber => {
                const url = 'https://pandalab.page.link/qbvQ';
                this.downloadFile(url, agentApkPath, subscriber);
            });
        } else {
            console.log(`${agentApkPath} already exist`);
            return of(agentApkPath);
        }
    }

    public configureSpoonJar() {
        const spoonJarPath = workspace.spoonJarPath;
        if (!fs.existsSync(spoonJarPath)) {
            console.log(`${spoonJarPath} already exist`);
            return new Observable<string>(subscriber => {
                const url = 'https://search.maven.org/remote_content?g=com.squareup.spoon&a=spoon-runner&v=LATEST&c=jar-with-dependencies';
                this.downloadFile(url, spoonJarPath, subscriber);
            });
        } else {
            console.log(`${spoonJarPath} already exist`);
            return of(spoonJarPath);
        }
    }

    private downloadFile(url: string, destination: string, subscriber) {
        const request = require('request');
        const file = fs.createWriteStream(destination);
        const req = request({
            uri: url,
            gzip: true
        });

        req.pipe(file)
            .on('finish', () => {
                subscriber.next(destination);
                subscriber.complete();
            })
            .on('error', (error) => {
                subscriber.error(error);
            });
    }
}
