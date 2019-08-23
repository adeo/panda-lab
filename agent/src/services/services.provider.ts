
export interface ServicesProvider {

    isElectron: boolean;

}

export class Services {
    private static instance: ServicesProvider;

    static getInstance(): ServicesProvider {
        console.log("ici");

        if (!Services.instance) {
            if (typeof window !== 'undefined' && typeof window['process'] === 'object' && window['process'].type === 'renderer') {
                // Renderer process
                Services.instance = RemoteServicesProvider.newInstance();
            } else if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
                // Main process
                Services.instance = LocalServicesProvider.newInstance();
            } else if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
                // Detect the user agent when the `nodeIntegration` option is set to true
                Services.instance = RemoteServicesProvider.newInstance();
            } else {
                Services.instance = LocalServicesProvider.newInstance();
                Services.instance.isElectron = false;
            }
        }
        return Services.instance;
    }
}


class RemoteServicesProvider {
    static newInstance(): ServicesProvider {
        return require('electron').remote.app["serviceProvider"]
    }
}


class LocalServicesProvider implements ServicesProvider {

    isElectron: boolean = true;

    private constructor() {
        console.log("Service provider initialized")
    }

    static newInstance() {
        return new LocalServicesProvider();
    }

    //TODO
    getAdbService() {
        if (!this.isElectron) {
            throw new Error("Can't user adb outside electron");
        }

    }


}
