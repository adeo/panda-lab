import {ElectronStoreRepository, StoreRepository, WebStoreRepository} from "./repositories/store.repository";
import {FirebaseConfig, FirebaseRepository} from "./repositories/firebase.repository";
import {AdbRepository} from './repositories/adb.repository';
import {FirebaseAuthService} from "./firebaseauth.service";
import {JobsService} from "./jobs.service";
import {AgentService} from "./agent.service";
import {AgentRepository} from "./repositories/agent.repository";
import {WorkspaceRepository} from "./repositories/workspace.repository";
import {DevicesService} from "./devices.service";
import {DevicesRepository} from "./repositories/devices.repository";
import {SpoonRepository} from "./repositories/spoon.repository";
import {firebase} from "@firebase/app";
import * as winston from "winston";

export interface ServicesProvider {
    config: ServicesConfiguration;

    store: StoreRepository;
    firebaseRepo: FirebaseRepository;
    authService: FirebaseAuthService;
    jobsService: JobsService;
    devicesService: DevicesService;
    agentService?: AgentService

    logger : winston.Logger

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
    agentService?: AgentService;
    logger: winston.Logger;

    private constructor(public config: ServicesConfiguration) {
        console.log("Service provider initialized");

        let runtimeEnv = getRuntimeEnv();
        if (runtimeEnv == RuntimeEnv.ELECTRON_RENDERER) {
            throw new Error("Can't instanciate local services provider in electron renderer process");
        }


        const logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
        });
        logger.add(new winston.transports.Console({
            format: winston.format.simple()
        }));

        this.logger = logger;

        this.firebaseRepo = new FirebaseRepository(config);
        this.jobsService = new JobsService(this.firebaseRepo);
        this.devicesService = new DevicesService(this.firebaseRepo, new DevicesRepository());

        switch (runtimeEnv) {
            case RuntimeEnv.ELECTRON_MAIN: {

                this.logger
                    .add(new winston.transports.File({filename: 'error.log', level: 'error'}))
                    .add(new winston.transports.File({filename: 'combined.log'}));


                this.store = new ElectronStoreRepository();
                const adbRepository = new AdbRepository();
                const workspaceRepository = new WorkspaceRepository();
                this.authService = new FirebaseAuthService(this.firebaseRepo, this.store);
                const agentRepository = new AgentRepository(workspaceRepository, this.authService, this.firebaseRepo, this.store);
                this.agentService = new AgentService(
                    this.logger.child({service : "agentService"}),
                    adbRepository,
                    this.authService, this.firebaseRepo,
                    agentRepository,
                    this.devicesService,
                    this.store
                );
                const spoonRepo = new SpoonRepository(
                    agentRepository,
                    this.agentService,
                    this.firebaseRepo,
                    adbRepository,
                    this.devicesService,
                    this.jobsService,
                    workspaceRepository);
                spoonRepo.setup();
                break;
            }
            case RuntimeEnv.WEB: {
                this.store = new WebStoreRepository();
                this.authService = new FirebaseAuthService(this.firebaseRepo, this.store);
                break;
            }
        }

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
