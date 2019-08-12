import {Guid} from 'guid-typescript';
import {LogcatMessage} from "@/models/adb";
import {adb} from "@/services/remote";

const ACTIVITY_COMPONENT = 'com.leroymerlin.pandalab/.GenerateUniqueId';

export class GetDeviceIdentifierAction {

    private adbClient: any;

    constructor() {
        this.adbClient = adb;
    }

    async execute(deviceId: string): Promise<string> {
        const transactionId = Guid.create().toString();
        return this.buildLogcat(deviceId, transactionId)
            .then(logcat => {
                    return new Promise<LogcatMessage>((resolve, reject) => {
                        logcat
                            .excludeAll()
                            .include(transactionId)
                            .on('entry', (entry: LogcatMessage) => {
                                resolve(entry);
                                logcat.end();
                            })
                            .on('error', (error) => {
                                reject(error);
                            });
                    });
                }
            ).then(logcatMessage => {
                const message = JSON.parse(logcatMessage.message);
                return message.device_id;
            });
    }

    private async buildLogcat(deviceId: string, transactionId: string) {
        const logcat = await this.adbClient.openLogcat(deviceId, {clear: true});
        await this.adbClient.startActivity(deviceId, {
            component: ACTIVITY_COMPONENT,
            extras: { transactionId }
        });
        return logcat;
    }
}
