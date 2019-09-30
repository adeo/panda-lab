import {FirebaseRepository} from "./repositories/firebase.repository";
import {DevicesRepository} from "./repositories/devices.repository";
import {Device, DevicesGroup, CollectionName} from 'pandalab-commons';
import {from, Observable} from "rxjs";
import {flatMap} from "rxjs/operators";

export class DevicesService {


    constructor(private firebaseRepo: FirebaseRepository, private devicesRepo: DevicesRepository) {

    }

    listenDevices(): Observable<Device[]> {
        let query = this.firebaseRepo.getCollection(CollectionName.DEVICES);
        return this.firebaseRepo.listenQuery(query)
    }

    updateDevice(device: Device) {
        return this.firebaseRepo.saveDocument(device, true)
    }


    listenDevice(deviceId: string): Observable<Device> {
        return this.firebaseRepo.listenDocument(CollectionName.DEVICES, deviceId)
    }


    listenGroups(): Observable<DevicesGroup[]> {
        return this.firebaseRepo.listenCollection(CollectionName.DEVICE_GROUPS)
    }

    listenGroup(groupId: string): Observable<DevicesGroup> {
        return this.firebaseRepo.listenDocument(CollectionName.DEVICE_GROUPS, groupId)
    }

    saveGroup(group: DevicesGroup): Observable<DevicesGroup>{
        return this.firebaseRepo.saveDocument(group);
    }
    createGroup(groupName: string): Observable<DevicesGroup> {
        let group = {
            devices: [],
            name: groupName
        } as DevicesGroup;
        return from(this.firebaseRepo.getCollection(CollectionName.DEVICE_GROUPS).add(group))
            .pipe(flatMap(value => this.firebaseRepo.getDocument<DevicesGroup>(value)));
    }
}
