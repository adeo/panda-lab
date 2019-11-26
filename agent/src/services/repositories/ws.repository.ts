import "rxjs-compat/add/operator/multicast";
import * as winston from "winston";

import * as http from 'http';
import * as WebSocket from 'ws';
import {StreamService} from "../node/stream.service";
import {AddressInfo} from "net";
import {NetworkRepository} from "./network.repository";
import {ControlMsg} from "../../models/stream";


export class WsRepository {


    constructor(private logger: winston.Logger,
                private networkRepo: NetworkRepository,
                private streamService: StreamService) {

        const express = require('express');

        const app = express();

        const server = http.createServer(app);

        const wss = new WebSocket.Server({server, host: this.networkRepo.getIp()});


        wss.on('connection', (ws: WebSocket) => {
            //connection is up, let's add a simple simple event

            ws.on('message', (data: string) => {

                const {action, payload} = JSON.parse(data);
                //log the received message and send it back to the client
                if (action == "stream") {
                    this.logger.info("New stream on device " + payload);
                    streamService.listenStream(ws, payload)
                } else if (action == "control") {
                    const msg = JSON.parse(payload) as ControlMsg;
                    streamService.controlMsg(msg.deviceId, msg)
                }
                //ws.send(`Hello, you sent -> ${message}`);
            });
            this.logger.info("Client connected");

        });

        //start our server
        server.listen(this.networkRepo.getStreamPort(), () => {
            let address = server.address() as AddressInfo;
            this.logger.warn(`Server started on ${address.address}:${address.port})`);
        });

    }


}


