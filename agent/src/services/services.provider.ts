import {ElectronStoreRepository, StoreRepository, WebStoreRepository} from "./repositories/store.repository";
import {FirebaseConfig, FirebaseRepository} from "./repositories/firebase.repository";
import {AdbService} from './node/adb.service';
import {FirebaseAuthService} from "./firebaseauth.service";
import {JobsService} from "./jobs.service";
import {AgentService} from "./agent.service";
import {SetupService} from "./node/setup.service";
import {FilesRepository} from "./repositories/files.repository";
import {DevicesService} from "./devices.service";
import {DevicesRepository} from "./repositories/devices.repository";
import {SpoonService} from "./node/spoon.service";
import {firebase} from "@firebase/app";
import * as winston from "winston";
import {AppsService} from "./apps.service";
import {AgentsService} from "./agents.service";
import {UserService} from "./user.service";
import {BrowserConsole} from "../utils/console.utils";

const jsonStringify = require('fast-safe-stringify');

export interface ServicesProvider {
    config: ServicesConfiguration;
    logger: winston.Logger

    store: StoreRepository;
    firebaseRepo: FirebaseRepository;
    authService: FirebaseAuthService;
    jobsService: JobsService;
    devicesService: DevicesService;
    appsService: AppsService
    agentsService: AgentsService;
    userService: UserService;

    node?: {
        agentService: AgentService
    }

}

export class Services {
    private static instance: ServicesProvider;

    static getInstance(): ServicesProvider {
        if (!Services.instance) {
            throw new Error("Services not initialized. Please call Services.setup(...) first");
        }
        return Services.instance;
    }

    static setup(config: ServicesConfiguration) {
        switch (getRuntimeEnv()) {
            case RuntimeEnv.ELECTRON_MAIN:
            case RuntimeEnv.WEB:
                // if (getRuntimeEnv() == RuntimeEnv.ELECTRON_MAIN) {
                //     (global as any).WebSocket = require('ws');
                //     (global as any).XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
                // }
                (global as any).XMLHttpRequest = require('xhr2');
                (global as any).WebSocket = require('ws');
                Services.instance = LocalServicesProvider.newInstance(config);
                break;
            case RuntimeEnv.ELECTRON_RENDERER:
                Services.instance = RemoteServicesProvider.newInstance(config);
                break;
        }
        if (getRuntimeEnv() == RuntimeEnv.ELECTRON_MAIN) {
            require('electron').app["serviceProvider"] = Services.instance
        }
    }
}


export interface ServicesConfiguration extends FirebaseConfig {

}

class RemoteServicesProvider {
    static newInstance(config: ServicesConfiguration): ServicesProvider {
        const remote = require('electron').remote as any;
        firebase.initializeApp(config);
        return remote.app.serviceProvider
    }
}

class LocalServicesProvider implements ServicesProvider {

    store: StoreRepository;
    firebaseRepo: FirebaseRepository;
    authService: FirebaseAuthService;
    jobsService: JobsService;
    devicesService: DevicesService;
    logger: winston.Logger;
    appsService: AppsService;
    agentsService: AgentsService;
    userService: UserService;
    node: {
        agentService: AgentService;
    };

    private constructor(public config: ServicesConfiguration) {
        let runtimeEnv = getRuntimeEnv();
        if (runtimeEnv == RuntimeEnv.ELECTRON_RENDERER) {
            throw new Error("Can't instanciate local services provider in electron renderer process");
        }

        this.logger = this.createLogger();

        this.firebaseRepo = new FirebaseRepository(config);
        this.jobsService = new JobsService(this.firebaseRepo);
        this.devicesService = new DevicesService(this.firebaseRepo);

        this.agentsService = new AgentsService(this.firebaseRepo);

        this.appsService = new AppsService(
            this.logger.child({context: 'Apps'}),
            this.firebaseRepo
        );

        const authLogger = this.logger.child({context: 'Auth'});
        switch (runtimeEnv) {
            case RuntimeEnv.ELECTRON_MAIN: {

                this.logger
                    .add(new winston.transports.File({filename: 'error.log', level: 'error'}))
                    .add(new winston.transports.File({filename: 'combined.log'}));


                this.store = new ElectronStoreRepository();
                const adbRepository = new AdbService(this.logger.child({context: 'Adb'}));
                const workspaceRepository = new FilesRepository(this.logger.child({context: 'Workspace'}));
                this.authService = new FirebaseAuthService(authLogger, this.firebaseRepo, this.store);
                const agentRepository = new SetupService(
                    this.logger.child({context: 'Setup'}),
                    workspaceRepository,
                    this.authService,
                    this.firebaseRepo,
                    this.store);
                const agentService = new AgentService(
                    this.logger.child({context: "Agent"}),
                    adbRepository,
                    this.authService, this.firebaseRepo,
                    agentRepository,
                    this.devicesService,
                    new DevicesRepository(),
                    this.agentsService,
                    this.store
                );
                const spoonRepo = new SpoonService(
                    this.logger.child({context: "Spoon"}),
                    agentRepository,
                    agentService,
                    this.firebaseRepo,
                    adbRepository,
                    this.agentsService,
                    this.jobsService,
                    workspaceRepository);

                this.node = {
                    agentService: agentService
                };

                spoonRepo.setup();
                break;
            }
            case RuntimeEnv.WEB: {
                this.store = new WebStoreRepository();
                this.authService = new FirebaseAuthService(authLogger, this.firebaseRepo, this.store);
                break;
            }
        }
        this.userService = new UserService(this.firebaseRepo, this.authService, this.appsService);
    }

    private createLogger() {
        const logger = winston.createLogger({
            level: 'verbose',
            format: winston.format.json(),
        });

        let timestampFormat = winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        });
        let printfFormat = winston.format.printf(info => {
            const stringifiedRest = jsonStringify(Object.assign({}, info, {
                level: undefined,
                message: undefined,
                timestamp: undefined,
                context: undefined
            }));
            return `${info.timestamp} ${info.level[0].toUpperCase()}/${(info.context !== undefined) ? info.context + ":" : ":"} ${info.message} ${(stringifiedRest !== '{}') ? stringifiedRest : ''}`;
        });

        if (getRuntimeEnv() == RuntimeEnv.WEB) {
            logger.add(new BrowserConsole({
                format: winston.format.combine(timestampFormat, printfFormat),
            }));
        } else {
            logger.add(new winston.transports.Console({
                format: winston.format.combine(timestampFormat, winston.format.colorize(), printfFormat)
            }));
        }
        return logger;
    }

    static newInstance(config: ServicesConfiguration) {
        return new LocalServicesProvider(config);
    }


}


export const getRuntimeEnv = () => {
    if (typeof window !== 'undefined' && typeof window['process'] === 'object' && window['process'].type === 'renderer') {
        // Renderer process
        return RuntimeEnv.ELECTRON_RENDERER;
    } else if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
        // Main process
        return RuntimeEnv.ELECTRON_MAIN;
    } else if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        // Detect the user agent when the `nodeIntegration` option is set to true
        return RuntimeEnv.ELECTRON_RENDERER;
    } else {
        return RuntimeEnv.WEB;
    }
};


export enum RuntimeEnv {
    ELECTRON_MAIN,
    ELECTRON_RENDERER,
    WEB
}
