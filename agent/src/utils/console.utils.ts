import winston from "winston";
import Transport from "winston-transport";

export class BrowserConsole extends Transport {

    constructor(opts?: any) {
        super(opts);
    }

    public log(info: winston.LogEntry, next: () => void) {
        const level = info.level != 'verbose' ? info.level : 'debug';
        const message = info.message;
        // eslint-disable-next-line no-console,no-restricted-syntax
        console[level](message);
        next();
    }

}
