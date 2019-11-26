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
import {ControlMsg, ControlType} from "../../models/stream";


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
            if (this.cacheMap.has(data.deviceId) && !this.cacheMap.get(data.deviceId).videoSocket.isFinish()) {
                connectionObs = of(this.cacheMap.get(data.deviceId));
            } else {
                this.cacheMap.delete(data.deviceId);
                connectionObs = this.newStream(data.deviceId)
            }
            return connectionObs.pipe(
                map(connection => {
                    this.cacheMap.set(data.deviceId, connection);
                    connection.videoSocket.addClient(data.ws);
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

    private newStream(deviceId: string) {

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
                return defer(() => this.startStream(value.adbDevice.id));
            }),
        )
    }

    async startStream(adbId): Promise<DeviceConnection> {
        const remoteServerPath = "/data/local/tmp/scrcpy-server";

        const localPort = await this.getPort({port: this.getPort.makeRange(27000, 28000)});
        const maxSize = 1920; //unlimited
        const bitRate = 8000000;

        const tunnel_forward = false;

        const control = true;

        //const adb = require('adbkit');
        const adbClient = this.adbService.adbClient;

        await adbClient.push(adbId, this.workspace.scrcpyJarPath, remoteServerPath);

        //socket name scrcpy
        await adbClient.reverse(adbId, "localabstract:scrcpy", "tcp:" + localPort);

        let promiseResolve;
        let promiseReject;
        let promise = new Promise<DeviceConnection>((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        let connection: DeviceConnection = {
            controlSocket: new ControlSocket(this.logger),
            videoSocket: new VideoSocket(this.logger, () => {
                this.logger.warn("no client connected. Destroy socket");
                connection.videoSocket.socket.destroy();
                connection.videoSocket.socket = null;
                let socket = connection.controlSocket.socket;
                if(socket){
                    socket.destroy();
                }
                connection.controlSocket.buffer = null;
                connection.server.close();
                connection.server = null;
                this.cacheMap.delete(adbId);
                require('child_process').execFile(adbClient.options.bin, ["reverse", "--remove", "localabstract:scrcpy"], (error, stdout, stderr) => {
                    this.logger.info("remove tcp connection with device", stdout);
                });
            })
        };

        connection.server = this.net.createServer(socket => {
            if (connection.videoSocket.socket == undefined) {
                this.logger.info("video socket created");
                connection.videoSocket.initialized(socket).then(value => {
                    promiseResolve(connection);
                }, reason => {
                    promiseReject(reason);
                });
            } else {
                connection.controlSocket.initialize(socket)
            }
        });
        connection.server.listen(localPort);


        let maxFps = 30;
        let cmd = `CLASSPATH=${remoteServerPath} app_process / com.genymobile.scrcpy.Server 1.11 ${maxSize} ${bitRate} ${maxFps} ${tunnel_forward} - false ${control}`;
        adbClient.shell(adbId, cmd).then(this.adb.util.readAll)
            .then((result => {
                this.logger.info("adb command finish with return : " + result.toString().trim());
            }));
        return promise;
    }

    controlMsg(deviceId: string, msg: ControlMsg) {
        let deviceConnection = this.cacheMap.get(deviceId);
        if (deviceConnection) {
            deviceConnection.controlSocket.sendMessage(msg);
        } else {
            this.logger.warn("can't send control to device. Stream not found")
        }
    }
}


interface DeviceConnection {
    server?: Server;
    videoSocket: VideoSocket;
    controlSocket: ControlSocket;
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
        this.socket = socket;

        return new Promise<void>((resolve, reject) => {
            socket.once("data", (data) => {
                if (data.length != this.DEVICE_NAME_FIELD_LENGTH + 4) {
                    reject(new Error("Can't initialize video socket with bytes count" + data.length));
                    return;
                }
                this.width = data.readInt16BE(this.DEVICE_NAME_FIELD_LENGTH);
                this.height = data.readInt16BE(this.DEVICE_NAME_FIELD_LENGTH + 2);
                this.deviceName = data.toString("utf8", 0, this.DEVICE_NAME_FIELD_LENGTH);
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


    addClient(socket: WebSocket) {
        this.logger.info("New client listening");
        this.avcServer.new_client(socket);
    }


}


class ControlSocket {

    CONTROL_MSG_TEXT_MAX_LENGTH = 300;
    CONTROL_MSG_CLIPBOARD_TEXT_MAX_LENGTH = 4093;
    CONTROL_MSG_SERIALIZED_MAX_SIZE = 3 + this.CONTROL_MSG_CLIPBOARD_TEXT_MAX_LENGTH

    public socket: Socket;

    public buffer = new Buffer(this.CONTROL_MSG_SERIALIZED_MAX_SIZE);

    constructor(private logger: winston.Logger) {
        this.buffer.byteLength
    }

    initialize(socket: Socket) {
        this.socket = socket;
    }

    sendMessage(msg: ControlMsg) {

        let offset = 0;
        offset = this.buffer.writeInt8(msg.type, offset);
        switch (msg.type) {
            case ControlType.CONTROL_MSG_TYPE_INJECT_KEYCODE:
                offset = this.buffer.writeInt8(msg.action, offset);
                offset = this.buffer.writeInt32BE(msg.keycode, offset);
                offset = this.buffer.writeInt32BE(msg.metaState, offset);
                break;
            case ControlType.CONTROL_MSG_TYPE_INJECT_TEXT:
            case ControlType.CONTROL_MSG_TYPE_SET_CLIPBOARD: {

                let stringBuffer = Buffer.from(msg.text);
                offset = this.buffer.writeInt16BE(stringBuffer.byteLength, offset);
                stringBuffer.copy(this.buffer, offset);
                offset = offset + stringBuffer.byteLength;
                break;
            }
            case ControlType.CONTROL_MSG_TYPE_INJECT_MOUSE_EVENT:
                offset = this.buffer.writeInt8(msg.action, offset);
                offset = this.buffer.writeInt32BE(0, offset); // pointerId is Long (64 bites)
                offset = this.buffer.writeInt32BE(msg.pointerId, offset);
                offset = this.writePosition(offset, msg);
                offset = this.buffer.writeInt16BE(msg.pressure, offset);
                offset = this.buffer.writeInt32BE(msg.buttons, offset);
                break;
            case ControlType.CONTROL_MSG_TYPE_INJECT_SCROLL_EVENT:
                offset = this.writePosition(offset, msg);
                offset = this.buffer.writeInt32BE(msg.hScroll, offset);
                offset = this.buffer.writeInt32BE(msg.vScroll, offset);
                break;
            case ControlType.CONTROL_MSG_TYPE_BACK_OR_SCREEN_ON:
            case ControlType.CONTROL_MSG_TYPE_EXPAND_NOTIFICATION_PANEL:
            case ControlType.CONTROL_MSG_TYPE_COLLAPSE_NOTIFICATION_PANEL:
            case ControlType.CONTROL_MSG_TYPE_GET_CLIPBOARD:
                break;
            case ControlType.CONTROL_MSG_TYPE_SET_SCREEN_POWER_MODE:
                offset = this.buffer.writeInt8(msg.action, offset);
                break;

        }
        this.socket.write(this.buffer.subarray(0, offset))
    }


    private writePosition(offset: number, msg: ControlMsg) {
        offset = this.buffer.writeInt32BE(msg.position.point.x, offset);
        offset = this.buffer.writeInt32BE(msg.position.point.y, offset);
        offset = this.buffer.writeInt16BE(msg.position.screenSize.width, offset);
        offset = this.buffer.writeInt16BE(msg.position.screenSize.height, offset);
        return offset;
    }
}

