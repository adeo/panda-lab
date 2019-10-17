import {BehaviorSubject, from, interval, merge, Observable, of, Subscription} from 'rxjs';
import {AdbStatus, AdbStatusState, DeviceAdb} from "../../models/adb";
import {
    catchError,
    distinctUntilChanged,
    filter,
    first,
    flatMap,
    map,
    switchMap,
    timeout,
    toArray
} from "rxjs/operators";
import {doOnSubscribe} from "../../utils/rxjs";
import winston from "winston";
import {Device} from "pandalab-commons";
import {AgentService} from "../agent.service";

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
                this.listDevices.next([]);
                this.updateAdbStatusFlux(AdbStatusState.LOADING)
            }),
            switchMap(() => this.adbClient.listDevicesWithPaths() as Promise<DeviceAdb[]>),
            distinctUntilChanged((prev, current) => {
                return JSON.stringify(prev) === JSON.stringify(current)
            }),
            map(value => {
                //deep copy to fix distinctUntilChanged error with uid in objects
                return JSON.parse(JSON.stringify(value))
            }),
            flatMap((devices: DeviceAdb[]) => {
                return from(devices).pipe(
                    filter(value => value.type != 'offline' && value.type != 'unauthorized'),
                    flatMap((device: DeviceAdb) =>
                        from(this.adbClient.getProperties(device.id))
                            .pipe(map(prop => {
                                    device.model = prop['ro.product.model'];
                                    device.serialId = prop['ro.serialno'];
                                    return device;
                                }),
                                catchError(error => {
                                    this.logger.warn("can't read device properties : " + device.id, error);
                                    return of(device)
                                })),
                    ),
                    flatMap((device: DeviceAdb) => {
                        return from(this.isInstalled(device.id, AgentService.MOBILE_AGENT_PACKAGE))
                            .pipe(map((isInstalled: boolean) => {
                                device.agentInstalled = isInstalled;
                                return device
                            }))
                    }),
                    toArray())
            }),
        ).subscribe((values: DeviceAdb[]) => {
            this.updateAdbStatusFlux(AdbStatusState.STARTED);
            this.listDevices.next(values);
        }, error => {
            this.updateAdbStatusFlux(AdbStatusState.STOPPED);
            this.listDevices.next([]);
            this.logger.error("TrackingAdb error", error);
            setTimeout(() => {
                this.restartAdbTracking();
            }, 10000);
        }, () => {
            this.listDevices.next([]);
            this.updateAdbStatusFlux(AdbStatusState.STOPPED);
        })
    }


    private updateAdbStatusFlux(state: AdbStatusState) {
        const adbStatus = {state, time: Date.now()};
        this.adbStatus.next(adbStatus);
    }

    public listenAdb(): Observable<DeviceAdb[]> {
        return this.listDevices
    }

    public getDeviceWithSerial(serialId: string): Observable<DeviceAdb | null> {
        return from(this.listDevices.getValue()).pipe(
            first(value => value.serialId === serialId),
        );
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
            const logcat = spawn(process.env.ANDROID_HOME + "/platform-tools/adb", ['-s', deviceId, 'logcat', '-v', 'threadtime']);

            logcat.stdout.on('data', (data) => {
                const lines = data.toString().split("\n");
                lines.filter(log => log.length > 0).forEach(log => {
                    const result = /^\d\d-\d\d\s+\d\d:\d\d:\d\d.\d+\s+\d+\s+\d+\s+[VDIWEAF](\s+)([^:]*):(.*)$/.exec(log.trim());
                    if (result !== null && result.length === 4) {
                        const tag = result[2];
                        const msg = result[3];
                        if (filter && tag === filter) {
                            emitter.next(msg)
                        } else if (!filter) {
                            emitter.next(msg);
                        }
                    }
                });
            });

            logcat.stderr.on('data', () => {
                this.logger.warn("logcat process error")
                //emitter.error(data);
            });

            logcat.on('close', (code) => {
                this.logger.verbose(`process exited with code ${code}`);
            });

            emitter.add(() => {
                logcat.kill();
            });
        });
    }


    launchActivity(deviceId: string, activityName: string): Observable<any> {
        return from(this.adbClient.startActivity(deviceId, {component: activityName})).pipe(first());
    }

    sendBroadcastWithData(deviceId: string, broadcastName: string, actionName: string, data: { [key: string]: string; }): Observable<string> {
        return new Observable(emitter => {
            const args = ['am', 'broadcast', '-a', actionName, '-n', broadcastName];
            Object.keys(data).forEach((key) => {
                args.push("--es", key, data[key])
            });
            this.adbClient.shell(deviceId, args)
                .then(this.adb.util.readAll)
                .then(function (output) {
                    emitter.next(output.toString().trim());
                    emitter.complete();
                })
                .catch(err => {
                    emitter.error(err);
                });
        });
    }

    launchActivityWithExtras(deviceId: string, activityName: string, extras: { [key: string]: string; }): Observable<any> {
        return from(this.adbClient.startActivity(deviceId, {component: activityName, extras: extras}))
            .pipe(first())
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
        return from(this.adbClient.install(deviceId, path)).pipe(first());
        // return concat<DeviceLog>(
        //
        //     of(<DeviceLog>{log: "Apk installed", type: DeviceLogType.INFO}),
        //     this.isInstalled(deviceId, path)
        // );

        // from()
        //     .pipe(
        //         first(),
        //         flatMap(() => this.isInstalled(deviceId, path)
        //             .map(installed => {
        //                 if(!installed){
        //
        //                 }
        //             })
        //             .pipe(retry())
        //         ),
        //         map(() => <DeviceLog>{log: "Apk installed", type: DeviceLogType.INFO}),
        //     )
    }

    connectIp(ip: string): Observable<any> {
        return from(this.adbClient.connect(ip, 5555))
            .pipe(first(), timeout(10000));
        //map(() => <DeviceLog>{log: "connected to device", type: DeviceLogType.INFO}),
    }
}

