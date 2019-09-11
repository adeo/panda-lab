import {BehaviorSubject, from, Observable} from 'rxjs';
import {AdbStatus, AdbStatusState, DeviceAdb} from "../../models/adb";
import {DeviceLog, DeviceLogType} from "../../models/device";
import {debounceTime, timeout} from "rxjs/operators";

export class AdbRepository {

    private adbClient: any;
    private Readable: any;
    private request: any;
    private readonly listDevices: BehaviorSubject<Array<DeviceAdb>>;
    private readonly adbStatus: BehaviorSubject<AdbStatus>;
    private adb: any;

    constructor() {
        this.adb = require('adbkit');
        this.adbClient = this.adb.createClient();
        this.request = require('request');
        this.Readable = require('stream').Readable;
        this.listDevices = new BehaviorSubject(new Array<DeviceAdb>());
        this.adbStatus = new BehaviorSubject(<AdbStatus>{state: AdbStatusState.STOPPED, time: Date.now()});

        this.startTrackingAdb();
    }

    private startTrackingAdb() {
        const adbService = this;

        // Get for the first time the list of connected devices
        this.adbClient.listDevicesWithPaths()
            .then(devices => {
                console.log(devices);
                adbService.updateDevicesFlux(devices);
                adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
            })
            .catch(err => {
                console.error('Something went wrong:', err.stack);
                adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
            });

        // Listen adb actions
        this.adbClient.trackDevices()
            .then(tracker => {
                tracker.on('add', device => {
                    console.log('Device %s was plugged in', device.id);
                    const currentList = adbService.listDevices.value;

                    if (!currentList.includes(device)) {
                        currentList.push(device);
                    }

                    adbService.updateDevicesFlux(currentList);
                    adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
                });
                tracker.on('remove', device => {
                    console.log('Device %s was unplugged', device.id);
                    let currentList = adbService.listDevices.value;
                    currentList = currentList.filter(item => item.id !== device.id);

                    adbService.updateDevicesFlux(currentList);
                    adbService.updateAdbStatusFlux(AdbStatusState.STARTED);
                });
                tracker.on('end', () => {
                    console.log('Tracking stopped');
                    adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
                    setTimeout(() => {
                        adbService.restartAdbTracking();
                    }, 10000);
                });
            })
            .catch(err => {
                console.error('Something went wrong:', err.stack);
                adbService.updateAdbStatusFlux(AdbStatusState.STOPPED);
                setTimeout(() => {
                    adbService.restartAdbTracking();
                }, 10000);
            });
    }

    isConnected(serialId: string): boolean {
        const devices = this.listDevices.value;
        if (devices === null || devices.length === 0) {
            return false;
        }
        return devices.find(value => value.uid === serialId) !== null;
    }

    private updateDevicesFlux(devices: DeviceAdb[]) {
        this.listDevices.next(devices);
    }

    private updateAdbStatusFlux(state: AdbStatusState) {
        const adbStatus = {state, time: Date.now()};
        this.adbStatus.next(adbStatus);
    }

    listenAdb(): Observable<Array<DeviceAdb>> {
        return this.listDevices
            .pipe(
                debounceTime(1000)
            )
    }

    snapshotDeviceAdb(): Array<DeviceAdb> {
        return this.listDevices.getValue();
    }

    listenAdbStatus(): Observable<AdbStatus> {
        return this.adbStatus;
    }

    restartAdbTracking() {
        if (this.adbStatus.value.state === AdbStatusState.STOPPED) {
            this.updateAdbStatusFlux(AdbStatusState.LOADING);
            this.startTrackingAdb();
        }
    }

    readAdbLogcat(deviceId: string, filter?: string): Observable<string> {
        return new Observable(emitter => {
            console.log("listen device", deviceId, filter)
            this.adbClient.openLogcat(deviceId)
                .then(logcat => {
                    let logcatFilter = logcat;
                    if (filter) {
                        logcatFilter = logcat.excludeAll()
                            .include(filter)
                    }
                    logcatFilter.on('entry', (entry) => {
                        emitter.next(entry.message)
                    });
                    logcatFilter.on('error', (error) => {
                        emitter.error(error)
                    })

                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }


    launchActivity(deviceId: string, activityName: string): Observable<void> {
        return new Observable(emitter => {
            this.adbClient.startActivity(deviceId, {component: activityName})
                .then(() => {
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    sendBroadcastWithData(deviceId: string, broadcastName: string, actionName: string, data: { [key:string]:string; }): Observable<DeviceLog> {
        return new Observable(emitter => {
            const args = ['am', 'broadcast', '-a', actionName, '-n', broadcastName];
            Object.keys(data).forEach((key) => {
                args.push("--es", key, data[key])
            });
            console.log("sendBroadcastWithData", args.join(" "))
            this.adbClient.shell(deviceId, args)
                .then(this.adb.util.readAll)
                .then(function (output) {
                    emitter.next({log: `[${deviceId}] ${output.toString().trim()}`, type: DeviceLogType.INFO})
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    launchActivityWithToken(deviceId: string, activityName: string, token: string, agentId: string): Observable<DeviceLog> {
        return new Observable(emitter => {
            this.adbClient.startActivity(deviceId, {component: activityName, extras: {token, agentId}})
                .then(() => {
                    emitter.next({log: activityName + " started", type: DeviceLogType.INFO})
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    enableTcpIp(deviceId: string): Observable<number> {
        return new Observable(emitter => {
            this.adbClient.tcpip(deviceId, 5555)
                .then(port => {
                    emitter.next(port);
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    isInstalled(deviceId: string, packageName: string): Observable<boolean> {
        return from(this.adbClient.isInstalled(deviceId, packageName) as Promise<boolean>);
    }

    installApk(deviceId: string, path: string): Observable<any> {
        return from(this.adbClient.install(deviceId, path))
    }

    connectIp(ip: string): Observable<any> {
        return from(this.adbClient.connect(ip, 5555))
            .pipe(timeout(10000))
    }
}

