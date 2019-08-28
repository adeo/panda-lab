import {Observable, of} from "rxjs";
import "rxjs-compat/add/operator/delay";
import "rxjs-compat/add/operator/concat";
import {WorkspaceRepository} from "./repositories/workspace.repository";
import {FirebaseAuthService} from "./auth.service";
import {AgentService} from "./agent.service";


export class ConfigurationService {

    constructor(private workspace: WorkspaceRepository,
                private authService: FirebaseAuthService,
                private agentService: AgentService) {
    }

    public configure(): Observable<string> {
        return of('Start configuration')
            .concat(
                this.authService.createAgentToken(this.agentService.UUID).map(() => "Agent token configured 1/3"),
                this.configureMobileApk().map(() => "Agent mobile downloaded 2/3"),
                this.configureSpoonJar().map(() => "Spoon jar downloaded 3/3")
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

    private configureSpoonJar(): Observable<string> {  //TODO check file version & change url
        const spoonJarPath = this.workspace.spoonJarPath;
        if (!this.workspace.fileExist(spoonJarPath)) {
            return this.workspace.downloadFile(spoonJarPath, 'https://search.maven.org/remote_content?g=com.squareup.spoon&a=spoon-runner&v=LATEST&c=jar-with-dependencies')
        } else {
            return of(spoonJarPath)
        }
    }

}
