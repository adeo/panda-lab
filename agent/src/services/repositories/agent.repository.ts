import {BehaviorSubject, Observable, of} from "rxjs";
import "rxjs-compat/add/operator/delay";
import "rxjs-compat/add/operator/concat";
import {WorkspaceRepository} from "./workspace.repository";
import {FirebaseAuthService} from "../auth.service";
import {map} from "rxjs/operators";


export class AgentRepository {
    public UUID: string;


    public agentStatus = new BehaviorSubject<AgentStatus>(AgentStatus.NOT_LOGGED);


    constructor(private workspace: WorkspaceRepository,
                private authService: FirebaseAuthService) {
        const os = require('os');
        this.UUID = `pandalab-agent-desktop-${os.userInfo().uid}-${os.userInfo().username}`;

        const DESKTOP_AGENT = "agent";
        const ADMIN = "admin";

        this.authService.listenUser().subscribe(user => {
            //agent is configuring we ignore user change
            if (this.agentStatus.getValue() === AgentStatus.CONFIGURING) {
                return
            }

            if (user && user.role === ADMIN || user.role === DESKTOP_AGENT) {
                this.agentStatus.next(AgentStatus.CONFIGURING);
                let configureObs;
                if (user.role === ADMIN) {
                    configureObs = this.configureNewAgent();
                } else {
                    configureObs = this.configure()
                }
                configureObs.subscribe(log => {
                    console.log(log);
                }, error => {
                    console.error("can't configure agent", error);
                    this.agentStatus.next(AgentStatus.NOT_LOGGED);
                }, () => {
                    console.error("agent configured");
                    this.agentStatus.next(AgentStatus.READY)
                })
            } else {
                this.agentStatus.next(AgentStatus.NOT_LOGGED)
            }
        })
    }

    public configureNewAgent(): Observable<string> {
        return of('Create agent token').concat(
            this.authService.createAgentToken(this.UUID).pipe(map(() => "Agent token configured")),
            this.configure()
        )

    }

    public configure(): Observable<string> {
        return of('Configuration workspace')
            .concat(
                this.configureMobileApk().pipe(map(() => "Agent mobile downloaded")),
                this.configureSpoonJar().pipe(map(() => "Spoon jar downloaded"))
            );
    }

    private configureMobileApk(): Observable<string> {
        const pandaLabMobileApk = this.workspace.agentApkPath; //TODO check file version & change url
        if (!this.workspace.fileExist(pandaLabMobileApk)) {
            return this.workspace.downloadFile(pandaLabMobileApk, 'https://pandalab.page.link/qbvQ')
        } else {
            return of(pandaLabMobileApk)
        }
    }

    public getAgentApk(): string{
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
