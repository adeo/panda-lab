import * as admin from "firebase-admin";

class DeviceService {


    async updateDevicesInfos() {

        const devices = await admin.firestore().collection("devices")
            .where("lastConnexion", '<', Date.now() - 1000 * 60 * 60)
            .get();

        const devicesId = devices.docs.map(value => value.id);
        console.log("Ask update for "+devicesId.length +" devices");
        const promises = devicesId.map(async id =>
            await admin.messaging().sendToTopic(id, {
                data: {
                    action: "refresh"
                }
            }, {timeToLive: 60})
        );

        return Promise.all(promises)


    }
}
export const deviceService = new DeviceService();
