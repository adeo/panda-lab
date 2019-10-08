import {BehaviorSubject, from, interval, merge, Observable, Subscription} from 'rxjs';
import {AdbStatus, AdbStatusState, DeviceAdb} from "../../models/adb";
import {DeviceLog, DeviceLogType} from "../../models/device";
import {distinctUntilChanged, first, map, switchMap, timeout} from "rxjs/operators";
import {doOnSubscribe} from "../../utils/rxjs";
import winston from "winston";

export class AdbService {

    private adbClient: any;
    private Readable: any;
    private request: any;
    private readonly listDevices: BehaviorSubject<Array<DeviceAdb>>;
    private readonly adbStatus: BehaviorSubject<AdbStatus>;
    private adb: any;
    private trackingSub: Subscription;

    constructor(private logger: winston.Logger) {
        this.adb = require('adbkit');
        this.adbClient = this.adb.createClient();
        this.request = require('request');
        this.Readable = require('stream').Readable;
        this.listDevices = new BehaviorSubject(new Array<DeviceAdb>());
        this.adbStatus = new BehaviorSubject(<AdbStatus>{state: AdbStatusState.STOPPED, time: Date.now()});

        this.startTrackingAdb();
    }

    private startTrackingAdb() {
        const adbEventObs = new Observable<number>(
            subscriber => {
                // Listen adb actions
                this.adbClient.trackDevices()
                    .then(tracker => {
                        tracker.on('add', device => {
                            this.logger.info('Device ' + device.id + 's was plugged in');
                            subscriber.next(1)
                        });
                        tracker.on('remove', device => {
                            this.logger.info('Device ' + device.id + 's was unplugged');
                            subscriber.next(-1)

                        });
                        tracker.on('end', () => {
                            this.logger.warn('Tracking stopped');
                            subscriber.error("'Tracking stopped'")
                        });
                    })
                    .catch(err => {
                        this.logger.error('Something went wrong', err);
                        subscriber.error(err)
                    });
            }
        );

        if (this.trackingSub) {
            this.trackingSub.unsubscribe()
        }

        this.trackingSub = merge(
            interval(2000),
            adbEventObs,
        ).pipe(
            doOnSubscribe(() => {
                this.updateDevicesFlux([]);
                this.updateAdbStatusFlux(AdbStatusState.LOADING)
            }),
            switchMap(() => this.adbClient.listDevicesWithPaths())
        ).subscribe(values => {
            this.updateAdbStatusFlux(AdbStatusState.STARTED);
            this.updateDevicesFlux(values as any)
        }, error => {
            this.updateAdbStatusFlux(AdbStatusState.STOPPED);
            this.updateDevicesFlux([]);

            this.logger.error("TrackingAdb error", error);
            setTimeout(() => {
                this.restartAdbTracking();
            }, 10000);
        }, () => {
            this.updateDevicesFlux([]);
            this.updateAdbStatusFlux(AdbStatusState.STOPPED);
        })
    }

    private updateDevicesFlux(devices: DeviceAdb[]) {
        devices = devices.filter(value => value.type != 'offline' && value.type != 'unauthorized');
        this.listDevices.next(devices);
    }

    private updateAdbStatusFlux(state: AdbStatusState) {
        const adbStatus = {state, time: Date.now()};
        this.adbStatus.next(adbStatus);
    }

    listenAdb(): Observable<DeviceAdb[]> {
        return this.listDevices
            .pipe(
                distinctUntilChanged((prev, current) => {
                    return JSON.stringify(prev) === JSON.stringify(current)
                }),
                map(value => {
                    //deep copy to fix distinctUntilChanged error with uid in objects
                    return JSON.parse(JSON.stringify(value))
                })
            )
    }

    getDevices(): Observable<Array<DeviceAdb>> {
        return this.listDevices.asObservable();
    }

    snapshotDeviceAdb(): Array<DeviceAdb> {
        return this.listDevices.getValue();
    }

    listenAdbStatus(): Observable<AdbStatus> {
        return this.adbStatus;
    }

    restartAdbTracking() {
        this.startTrackingAdb();
    }

    readAdbLogcat(deviceId: string, filter?: string): Observable<string> {
        return new Observable(emitter => {
            const {spawn} = require('child_process');
            const logcat = spawn('adb', ['-s', deviceId, 'logcat']);

            logcat.stdout.on('data', (data) => {
                const lines = data.toString().split("\n");
                lines.forEach(log => {
                    const result = /^\d\d-\d\d\s+\d\d:\d\d:\d\d.\d+\s+\d+\s+\d+\s+[VDIWEAF](\s+)([^:]*):(.*)$/.exec(log);
                    if (result !== null && result.length === 4) {
                        const tag = result[2];
                        const msg = result[3];
                        if (filter && tag === filter) {
                            console.log(msg);
                            emitter.next(msg)
                        } else if(!filter){
                            emitter.next(msg);
                        }
                    }
                });
            });

            logcat.stderr.on('data', (data) => {
                emitter.error(data);
            });

            logcat.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
            });

            emitter.add(() => {
                logcat.kill();
            });


            // this.adbClient.openLogcat(deviceId)
            //     .then(logcat => {
            //         let logcatFilter = logcat;
            //         // if (filter) {
            //         //     logcatFilter = logcat.excludeAll()
            //         //         .include(filter)
            //         // }
            //         logcatFilter.on('entry', (entry) => {
            //             if (filter) {
            //                 if (entry.message.indexOf(filter) >= 0) {
            //                     emitter.next(entry.message)
            //                 }
            //             } else {
            //                 emitter.next(entry.message);
            //             }
            //         });
            //         logcatFilter.on('error', (error) => {
            //             emitter.error(error)
            //         })
            //
            //     })
            //     .catch(err => {
            //         emitter.error(err);
            //     });
        });
    }


    launchActivity(deviceId: string, activityName: string): Observable<DeviceLog> {
        return new Observable(emitter => {
            this.adbClient.startActivity(deviceId, {component: activityName})
                .then(() => {
                    emitter.next({type: DeviceLogType.INFO, log: "Activity started"});
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    sendBroadcastWithData(deviceId: string, broadcastName: string, actionName: string, data: { [key: string]: string; }): Observable<DeviceLog> {
        return new Observable(emitter => {
            const args = ['am', 'broadcast', '-a', actionName, '-n', broadcastName];
            Object.keys(data).forEach((key) => {
                args.push("--es", key, data[key])
            });
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

    connectIp(ip: string): Observable<DeviceLog> {
        return from(this.adbClient.connect(ip, 5555))
            .pipe(
                first(),
                map(() => <DeviceLog>{log: "connected to device", type: DeviceLogType.INFO}),
                timeout(10000)
            )
    }
}

