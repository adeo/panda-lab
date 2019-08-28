import * as devicesData from "../../assets/data/devices-data-complete.json"

export class DevicesRepository {


    constructor() {
    }

    private getDevicesData(): DeviceData[] {
        return devicesData;
    }

    searchDeviceData(phoneDevice: string, phoneModel: string): DeviceData | null {
        return devicesData.find(
            (device) => {
                return device.deviceName === phoneDevice ||
                    device.deviceCode === phoneDevice ||
                    device.deviceOtherCode === phoneDevice ||
                    device.deviceName === phoneModel ||
                    device.deviceCode === phoneModel ||
                    device.deviceOtherCode === phoneModel;
            }
        );
    }

}

export interface DeviceData {
    deviceFullName: string;
    deviceName: string;
    deviceCode: string;
    deviceBrand: string;
    devicePictureUrl: string;
    deviceProcessor: string;
    deviceOtherCode: string;
}
