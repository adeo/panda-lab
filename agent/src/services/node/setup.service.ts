import {BehaviorSubject, from, Observable, of} from "rxjs";
import "rxjs-compat/add/operator/delay";
import "rxjs-compat/add/operator/concat";
import {FilesRepository} from "../repositories/files.repository";
import {FirebaseAuthService} from "../firebaseauth.service";
import {flatMap, map, tap} from "rxjs/operators";
import {FirebaseRepository} from "../repositories/firebase.repository";
import {StoreRepository} from "../repositories/store.repository";
import {FileData} from "pandalab-commons";
import HttpsCallableResult = firebase.functions.HttpsCallableResult;


export class SetupService {
    public UUID: string;


    public agentStatus = new BehaviorSubject<AgentStatus>(AgentStatus.NOT_LOGGED);


    constructor(private workspace: FilesRepository,
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
                console.log("start configuration");
                this.agentStatus.next(AgentStatus.CONFIGURING);
                this.configure().subscribe(log => {
                    console.log(log);
                }, error => {
                    console.error("can't configure agent", error);
                    this.agentStatus.next(AgentStatus.NOT_LOGGED);
                }, () => {
                    console.log("agent configured");
                    this.agentStatus.next(AgentStatus.READY)
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

    private configureMobileApk(): Observable<string> {
        return from(this.firebaseRepo.firebase.functions().httpsCallable("getFileData")({path: 'config/android-agent.apk'}))
            .pipe(
                flatMap((result: HttpsCallableResult) => {
                    const value = result.data as FileData;
                    const currentDate = parseInt(this.storeRepo.load("agent_last_date", "0"));
                    const update = currentDate < value.updatedAt;
                    if (update || !this.workspace.fileExist(this.workspace.agentApkPath)) {
                        console.log("update local agent apk");
                        this.workspace.delete(this.workspace.agentApkPath);
                        return this.workspace.downloadFile(this.workspace.agentApkPath, value.downloadUrl)
                            .pipe(tap(this.storeRepo.save("agent_last_date", String(value.updatedAt))))
                    } else {
                        return of(this.workspace.agentApkPath)
                    }

                })
            )
    }

    public getAgentApk(): string {
        return this.workspace.agentApkPath;
    }

    private configureSpoonJar(): Observable<string> {  //TODO check file version & change url
        const spoonJarPath = this.workspace.spoonJarPath;
        if (!this.workspace.fileExist(spoonJarPath)) {
            return this.workspace.downloadFile(spoonJarPath, 'https://search.maven.org/remote_content?g=com.squareup.spoon&a=spoon-runner&v=LATEST&c=jar-with-dependencies')
        } else {
            return of(spoonJarPath)
        }
    }

}


export enum AgentStatus {
    NOT_LOGGED,
    CONFIGURING,
    READY
}
