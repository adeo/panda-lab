import {Guid} from 'guid-typescript';

const ACTIVITY_COMPONENT = 'com.leroymerlin.pandalab/.GenerateUniqueId';

export interface LogcatMessage {
  pid: number;
  tid: number;
  tag: string;
  message: string;
}

async function buildLogcat(adbClient: any, deviceId: string, transactionId: string) {
  const logcat = null;//await adbClient.openLogcat(deviceId, {clear: true});
  await adbClient.startActivity(deviceId, {
    component: ACTIVITY_COMPONENT,
    extras: {
      transactionId,
    }
  });
  return logcat;
}

export async function getDeviceUUID(adbClient: any, deviceId: string): Promise<LogcatMessage> {
  const transactionId = Guid.create().toString();
  return buildLogcat(adbClient, deviceId, transactionId)
    .then(logcat => {
      return new Promise<LogcatMessage>((resolve, reject) => {
        logcat
          .excludeAll()
          .include(transactionId)
          .on('entry', (entry: LogcatMessage) => {
            resolve(JSON.parse(entry.message)['device_id']);
            logcat.end();
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    });
}
