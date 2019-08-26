import {ElectronStoreRepository, StoreRepository, WebStoreRepository} from "./repositories/store.repository";
import {FirebaseConfig, FirebaseRepository} from "./repositories/firebase.repository";
import {AdbRepository} from "@/services/repositories/adb.repository";

export interface ServicesProvider {

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
                Services.instance = LocalServicesProvider.newInstance(config);
                break;
            case RuntimeEnv.ELECTRON_RENDERER:
                Services.instance = RemoteServicesProvider.newInstance();
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
    static newInstance(): ServicesProvider {
        return require('electron').remote.app["serviceProvider"]
    }
}


class LocalServicesProvider implements ServicesProvider {

    store: StoreRepository;
    firebaseRepo: FirebaseRepository;

    private constructor(config: ServicesConfiguration) {
        console.log("Service provider initialized");
        switch (getRuntimeEnv()) {
            case RuntimeEnv.ELECTRON_RENDERER:
                throw new Error("Can't instanciate local services provider in electron renderer process");
            case RuntimeEnv.ELECTRON_MAIN:
                this.store = new ElectronStoreRepository();
                const adbRepository = new AdbRepository();

                break;
            case RuntimeEnv.WEB:
                this.store = new WebStoreRepository();
                break;
        }
        this.firebaseRepo = new FirebaseRepository(config);
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


enum RuntimeEnv {
    ELECTRON_MAIN,
    ELECTRON_RENDERER,
    WEB
}
