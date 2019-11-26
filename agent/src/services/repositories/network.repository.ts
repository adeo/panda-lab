import "rxjs-compat/add/operator/multicast";
import * as winston from "winston";


export class NetworkRepository {

    private static PORT = 8999;


    constructor(private logger: winston.Logger) {


    }

    getIp() {
        var os = require('os');
        var ifaces = os.networkInterfaces();

        const ipAddress = Object.keys(ifaces).map(ifname => {
            return ifaces[ifname].map(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }
                return iface.address
            }).filter(value => value);
        }).flat();

        return ipAddress[0]
    }

    getStreamPort() {
        return NetworkRepository.PORT
    }

    getStreamUrl() {
        return this.getIp() + ":" + NetworkRepository.PORT
    }
}


