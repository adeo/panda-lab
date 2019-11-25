import {Server, Socket} from 'net';
import winston from "winston";
import {FilesRepository} from "../repositories/files.repository";
import {AgentService} from "../agent.service";
import {AdbService} from "./adb.service";
import WebSocket from "ws";
import {DevicesService} from "../devices.service";
import {catchError, concatMap, filter, first, flatMap, map, tap} from "rxjs/operators";
import {defer, Observable, of, Subject} from "rxjs";
import {doOnSubscribe} from "../../utils/rxjs";


export class StreamService {

    fs;
    path;
    adb;
    net;
    private getPort: any;


    cacheMap = new Map<string, DeviceConnection>();

    constructor(private logger: winston.Logger,
                private workspace: FilesRepository,
                private agentService: AgentService,
                private deviceService: DevicesService,
                private adbService: AdbService) {
        this.fs = require('fs');
        this.path = require('path');

        this.adb = require('adbkit');
        this.net = require("net");
        this.getPort = require('get-port');


    }

    private streamSubjectEmitter = new Subject<{ ws: WebSocket, deviceId: string }>();

    private streamSubjectReceiver = new Subject<{ ws: WebSocket, error?: string }>();

    private sub = this.streamSubjectEmitter.pipe(
        concatMap(data => {
            let connectionObs: Observable<DeviceConnection>;
            if (this.cacheMap.has(data.deviceId) && !this.cacheMap.get(data.deviceId).videoSocket.isFinish) {
                connectionObs = of(this.cacheMap.get(data.deviceId));
            } else {
                this.cacheMap.delete(data.deviceId);
                connectionObs = this.newStream(data.ws, data.deviceId)
            }
            return connectionObs.pipe(
                map(connection => {
                    this.cacheMap.set(data.deviceId, connection);
                    connection.videoSocket.listen(data.ws);
                    return {ws: data.ws}
                }),
                catchError(err => {
                    data.ws.terminate();
                    return of({ws: data.ws, error: err});
                })
            )
        }),
    ).subscribe(this.streamSubjectReceiver);


    public listenStream(ws: WebSocket, deviceId: string) {
        return this.streamSubjectReceiver.pipe(
            doOnSubscribe(() => {
                this.streamSubjectEmitter.next({ws: ws, deviceId: deviceId})
            }),
            filter(result => result.ws === ws),
            first(),
        ).subscribe(
            (result) => {
                if (result.error) {
                    this.logger.error(result.error);
                } else {
                    this.logger.info("Stream started");
                }
            }
        )
    }

    private newStream(ws: WebSocket, deviceId: string) {

        return this.agentService.listenAgentDevices().pipe(
            first(),
            map(
                devices => devices.find(device => device.firebaseDevice && device.firebaseDevice._ref.id == deviceId && device.adbDevice)
            ),
            tap((value) => {
                if (value == null) {
                    this.logger.warn('device not available');
                    throw new Error('device not available for streaming');
                }
            }),
            flatMap(value => {
                return defer(() => this.startStream(value.adbDevice.serialId));
            }),
        )
    }

    async startStream(deviceId): Promise<DeviceConnection> {
        const remoteServerPath = "/data/local/tmp/scrcpy-server";

        const localPort = await this.getPort({port: this.getPort.makeRange(27000, 28000)});
        const maxSize = 0; //unlimited
        const bitRate = 8000000;

        //const adb = require('adbkit');
        const adbClient = this.adbService.adbClient;

        await adbClient.push(deviceId, this.workspace.scrcpyJarPath, remoteServerPath);

        //socket name scrcpy
        await adbClient.reverse(deviceId, "localabstract:scrcpy", "tcp:" + localPort);

        let promiseResolve;
        let promiseReject;
        let promise = new Promise<DeviceConnection>((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        let connection: DeviceConnection = {
            videoSocket: new VideoSocket(this.logger, () => {
                this.logger.warn("no client connected. Destroy socket");
                connection.videoSocket.socket.destroy();
                connection.videoSocket.socket = null;
                connection.server.close();
                connection.server = null;
                this.cacheMap.delete(deviceId);

                require('child_process').execFile(adbClient.options.bin, ["reverse", "--remove", "localabstract:scrcpy"], (error, stdout, stderr) => {
                    this.logger.info("remove tcp connection with device", stdout);
                });

            })
        };

        connection.server = this.net.createServer(socket => {
            if (connection.videoSocket.deviceName == undefined) {
                this.logger.info("video socket created");
                connection.videoSocket.initialized(socket).then(value => {
                    promiseResolve(connection);
                }, reason => {
                    promiseReject(reason);
                });
            }
        });
        connection.server.listen(localPort);

        const tunnel_forward = false;

        const control = false;


        let maxFps = 30;
        let cmd = `CLASSPATH=${remoteServerPath} app_process / com.genymobile.scrcpy.Server 1.11 ${maxSize} ${bitRate} ${maxFps} ${tunnel_forward} - false ${control}`;
        adbClient.shell(deviceId, cmd).then(this.adb.util.readAll)
            .then((result => {
                this.logger.info("adb command finish with return : " + result.toString().trim());
            }));
        return promise;
    }
}


interface DeviceConnection {
    server?: Server;
    videoSocket?: VideoSocket;
}

class VideoSocket {

    DEVICE_NAME_FIELD_LENGTH = 64;

    deviceName: string;
    width: number;
    height: number;

    fs = require('fs');
    stream = require('stream');
    AvcServer = require('ws-avc-player/lib/server');


    socket: Socket;
    private avcServer;

    constructor(private logger: winston.Logger, protected onFinish: () => void) {
    }


    public isFinish() {
        return this.socket == null;
    }

    public initialized(socket: Socket): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            socket.once("data", (data) => {
                if (data.length != this.DEVICE_NAME_FIELD_LENGTH + 4) {
                    reject(new Error("Can't initialize video socket with bytes count" + data.length));
                    return;
                }
                this.width = data.readInt16BE(this.DEVICE_NAME_FIELD_LENGTH);
                this.height = data.readInt16BE(this.DEVICE_NAME_FIELD_LENGTH + 2);
                this.deviceName = data.toString("utf8", 0, this.DEVICE_NAME_FIELD_LENGTH);
                this.socket = socket;
                // const wss = new WebSocketServer({port: 3333})
                this.avcServer = new this.AvcServer(null, this.width, this.height);
                this.avcServer.setVideoStream(this.socket);
                this.avcServer.on('client_disconnected', (_) => {
                    if (this.avcServer.clients.size == 0) {
                        this.onFinish();
                    }
                });
                resolve()
            });
        });
    }


    listen(socket: WebSocket) {

        //initial width and height (it adapts to the stream)

        this.avcServer.new_client(socket);
        //const wss = new WebSocketServer({ port: 3333 });
        //this.socket.pipe(wss)
        //} else {

        //this.readable.put(data);


        // var currentBuffer = data;
        // while (currentBuffer.length > 0) {
        //     currentBuffer = this.analyseStream(currentBuffer);
        // }

        // }
        //     let uint8Array = data.slice(12, 12 + this.currentPacketSize);
        //     if(uint8Array)
        //     data.slice()subarray(12);
        //     //console.log("pts", new this.Int64(data, 0).toNumber(true));
        //     console.log("packetSize", data.readInt32BE(8))
        //
        //     //this.fs.appendFileSync(fileName, data);
        // }

    }
}



