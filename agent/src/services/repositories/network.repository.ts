import "rxjs-compat/add/operator/multicast";
import * as winston from "winston";
import {WsRepository} from "./ws.repository";


export class NetworkRepository {
    private ipAddress: string[];

    private static PORT = 8999;


    constructor(private logger: winston.Logger) {

        var os = require('os');
        var ifaces = os.networkInterfaces();

        this.ipAddress = Object.keys(ifaces).map(ifname => {
            return ifaces[ifname].map(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }
                return iface.address
            }).filter(value => value);
        }).flat();
    }

    getIp() {
        return this.ipAddress[0]
    }
    getStreamPort() {
        return NetworkRepository.PORT
    }

    getStreamUrl() {
        return this.getIp() + ":" + NetworkRepository.PORT
    }
}


