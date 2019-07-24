import {Injectable} from '@angular/core';
import {ElectronService} from '../providers/electron.service';
import {LogcatMessage} from '../@core/models/adb';
import {Guid} from 'guid-typescript';

const ACTIVITY_COMPONENT = 'com.leroymerlin.pandalab/.GenerateUniqueId';

@Injectable()
export class GetDeviceIdentifierAction {

  private adbClient: any;

  constructor(private electronService: ElectronService) {
    this.adbClient = electronService.remote.require('./expose.ts').adbClient;
  }

  async execute(deviceId: string): Promise<LogcatMessage> {
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
      });
  }

  private async buildLogcat(deviceId: string, transactionId: string) {
    const logcat = await this.adbClient.openLogcat(deviceId, {clear: true});
    await this.adbClient.startActivity(deviceId, {
      component: ACTIVITY_COMPONENT,
      extras: {
        transactionId,
      }
    });
    return logcat;
  }
}
