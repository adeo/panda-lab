import {BehaviorSubject, Observable, of} from "rxjs";
import "rxjs-compat/add/operator/delay";
import "rxjs-compat/add/operator/concat";
import '@firebase/database';
import {FilesRepository} from "../repositories/files.repository";
import {FirebaseAuthService} from "../firebaseauth.service";
import {flatMap, map, tap} from "rxjs/operators";
import {FirebaseRepository} from "../repositories/firebase.repository";
import {StoreRepository} from "../repositories/store.repository";
import winston from "winston";


export class SetupService {
    public UUID: string;


    public agentStatus = new BehaviorSubject<AgentStatus>(AgentStatus.NOT_LOGGED);
    private updateOnlineStatusCallback: (a) => void = null;


    constructor(private logger: winston.Logger,
                private workspace: FilesRepository,
                private authService: FirebaseAuthService,
                private firebaseRepo: FirebaseRepository,
                private storeRepo: StoreRepository) {
        const os = require('os');
        this.UUID = `pandalab-agent-desktop-${os.userInfo().uid}-${os.userInfo().username}`;

        const DESKTOP_AGENT = "agent";
        const ADMIN = "admin";

        this.authService.listenUser().subscribe(user => {
            //agent is configuring we ignore user change
            if (this.agentStatus.getValue() === AgentStatus.CONFIGURING) {
                return
            }

            if (user && user.role === DESKTOP_AGENT) {
                this.logger.info("start configuration");
                this.agentStatus.next(AgentStatus.CONFIGURING);
                this.configure().subscribe(log => {
                    this.logger.verbose(log);
                    this.setStatusOnline(false);
                }, error => {
                    this.logger.error("can't configure agent", error);
                    this.agentStatus.next(AgentStatus.NOT_LOGGED);
                    this.setStatusOnline(false);
                }, () => {
                    this.logger.info("agent configured");
                    this.agentStatus.next(AgentStatus.READY);
                    this.setStatusOnline(true);
                })
            } else {
                this.agentStatus.next(AgentStatus.NOT_LOGGED)
            }
        })
    }

    public configure(): Observable<string> {
        return of('Configuration workspace')
            .concat(
                this.configureMobileApk().pipe(map(() => "Agent mobile downloaded")),
                this.configureSpoonJar().pipe(map(() => "Spoon jar downloaded"))
            );
    }

    public getAgentPublishTime(){
        return parseInt(this.storeRepo.load("agent_build_time", "0"))
    }

    private configureMobileApk(): Observable<string> {
        let filePath = 'config/android-agent.apk';
        return this.firebaseRepo.getFileMetadata(filePath)
            .pipe(
                flatMap((meta) => {
                    const publishDate = parseInt(meta.customMetadata.buildTime);
                    const currentDate = this.getAgentPublishTime();
                    const update = currentDate < publishDate;
                    if (update || !this.workspace.fileExist(this.workspace.agentApkPath)) {
                        this.logger.info("update local agent apk");
                        this.workspace.delete(this.workspace.agentApkPath);
                        return this.firebaseRepo.getFileUrl(filePath)
                            .pipe(flatMap(url => this.workspace.downloadFile(this.workspace.agentApkPath, url)))
                            .pipe(tap(this.storeRepo.save("agent_build_time", String(publishDate))))
                    } else {
                        return of(this.workspace.agentApkPath)
                    }

                })
            )
    }

    public getAgentApk(): string {
        return this.workspace.agentApkPath;
    }

    private configureSpoonJar(): Observable<string> {
        const spoonJarPath = this.workspace.spoonJarPath;
        if (!this.workspace.fileExist(spoonJarPath)) {
            return this.workspace.downloadFile(spoonJarPath, 'https://search.maven.org/remote_content?g=com.squareup.spoon&a=spoon-runner&v=LATEST&c=jar-with-dependencies')
        } else {
            return of(spoonJarPath)
        }
    }

    private setStatusOnline(value: boolean) {
        let deviceRef = this.firebaseRepo.firebase.database().ref("agents/" + this.UUID);

        if (this.updateOnlineStatusCallback) {
            deviceRef.off("value", this.updateOnlineStatusCallback);
            this.updateOnlineStatusCallback = null;
        }
        if (value) {
            this.updateOnlineStatusCallback = a => {
                if (!a.exists() || a.child("online").val() != true) {
                    deviceRef.set({
                        online: true
                    }).then(() => {
                        return deviceRef.onDisconnect().set({online: false});
                    });
                }
            };
            deviceRef.on("value", this.updateOnlineStatusCallback);
        }
    }

}


export enum AgentStatus {
    NOT_LOGGED,
    CONFIGURING,
    READY
}
