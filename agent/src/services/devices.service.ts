import {FirebaseRepository} from "./repositories/firebase.repository";
import {CollectionName, Device, DevicesGroup, DeviceStatus} from 'pandalab-commons';
import {combineLatest, from, Observable} from "rxjs";
import {flatMap} from "rxjs/operators";

export class DevicesService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    deleteAgent(device: Device): Observable<Device> {
        device.agent = null;
        device.status = DeviceStatus.offline;
        return this.firebaseRepo.saveDocument(device);
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

    listenerGroupAndDevices(groupId: string) {
        return combineLatest(
            this.listenGroup(groupId),
            this.listenDevices()
        );
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
