import * as admin from "firebase-admin";
import {CollectionName, Device, DeviceStatus} from "pandalab-commons";

class DeviceService {


    async updateDevicesInfos() {

        const devices = await admin.firestore().collection(CollectionName.DEVICES)
            .where("lastConnexion", '<', Date.now() - 1000 * 60 * 60)
            .get();

        const devicesId = devices.docs.map(value => value.id);
        console.log("Ask update for " + devicesId.length + " devices");
        const promises = devicesId.map(async id =>
            await admin.messaging().sendToTopic(id, {
                data: {
                    action: "refresh"
                }
            }, {timeToLive: 60})
        );

        return Promise.all(promises)


    }

    async setAgentDevicesStatusOffline(agentId: string) {
        const devices = await admin.firestore().collection(CollectionName.DEVICES).where("agent", "==", admin.firestore().collection(CollectionName.AGENTS).doc(agentId)).get();
        return Promise.all(devices.docs.map(value => {
            return value.ref.set(<Device>{status: DeviceStatus.offline}, {merge: true})
        }))
    }
}

export const deviceService = new DeviceService();
