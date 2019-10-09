import * as admin from "firebase-admin";
import {AgentModel, CollectionName, Device, DeviceStatus} from "pandalab-commons";

class DeviceService {

    async updateDeviceInfos(deviceId: string) {
        console.log("send refresh notification to " + deviceId);
        return admin.messaging().sendToTopic(deviceId, {
            data: {
                action: "refresh"
            }
        }, {timeToLive: 60})
    }

    async notifyDeviceStatusChange(deviceId: string, status: string) {
        console.log("send status notification to " + deviceId);
        return admin.messaging().sendToTopic(deviceId, {
            data: {
                action: "status",
                status: status,
            }
        }, {timeToLive: 120})
    }

    async updateDevicesInfos() {
        const devices = await admin.firestore().collection(CollectionName.DEVICES)
            .where("lastConnexion", '<', Date.now() - 1000 * 60 * 60)
            .get();

        const devicesId = devices.docs.map(value => value.id);
        console.log("Ask update for " + devicesId.length + " devices");
        const promises = devicesId.map(async id =>
            await this.updateDeviceInfos(id)
        );
        return Promise.all(promises)
    }

    async updateAgentDevicesStatus(online: boolean, agentId: string) {
        const agentRef = admin.firestore().collection(CollectionName.AGENTS).doc(agentId);
        await agentRef.set(<AgentModel>{online: online}, {merge: true});

        if (!online) {
            const devices = await admin.firestore().collection(CollectionName.DEVICES).where("agent", "==", agentRef).get();
            return Promise.all(devices.docs.map(value => {
                return value.ref.set(<Device>{status: DeviceStatus.offline}, {merge: true})
            }))
        }
        return Promise.resolve()
    }
}

export const deviceService = new DeviceService();
