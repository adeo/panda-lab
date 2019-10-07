import devicesData from "../../assets/data/output.json"

export class DevicesRepository {


    constructor() {
    }

    private getDevicesData(): DeviceData[] {
        return devicesData;
    }

    searchDeviceData(name: string): DeviceData | null {
        for(let device of this.getDevicesData()){
            if(device.name.toLowerCase() === name.toLowerCase()){
                return device
            }
        }
        return null;
    }

}

export interface DeviceData {
    name: string;
    url: string;
    brand: string;
}
//
// export interface DeviceData {
//     deviceFullName: string;
//     deviceName: string;
//     deviceCode: string;
//     deviceBrand: string;
//     devicePictureUrl: string;
//     deviceProcessor: string;
//     deviceOtherCode: string;
// }
