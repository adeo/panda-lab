import {AgentRepository, AgentStatus} from "./agent.repository";
import {BehaviorSubject, combineLatest, from, Observable, Subscription} from "rxjs";
import {CollectionName, FirebaseRepository} from "./firebase.repository";
import {AdbRepository} from "./adb.repository";
import {DevicesService} from "../devices.service";
import {filter, flatMap, map, tap, toArray} from "rxjs/operators";
import {Device, DeviceStatus, JobTask} from 'pandalab-commons';
import {JobsService} from "../jobs.service";

export class SpoonRepository {
    private statusSub: Subscription;


    constructor(private agentRepo: AgentRepository,
                private firebaseRepo: FirebaseRepository,
                private adbRepo: AdbRepository,
                private devicesService: DevicesService,
                private jobsService: JobsService) {

        this.agentRepo.agentStatus.subscribe(value => {
            switch (value) {
                case AgentStatus.CONFIGURING:
                case AgentStatus.NOT_LOGGED:
                    if (this.statusSub) {
                        this.statusSub.unsubscribe();
                        this.statusSub = null;
                    }
                    break;
                case AgentStatus.READY:
                    this.statusSub = this.listenJobs().subscribe();
                    break
            }
        })
    }


    private listenJobs(): Observable<void> {

        const changeBehaviour = new BehaviorSubject("");
        let hasChange = false;
        let working = false;

        return combineLatest(
            this.devicesService.listenAgentDevices(this.agentRepo.UUID),
            this.firebaseRepo.listenCollection(CollectionName.JOBS_TASKS),
            changeBehaviour,
            (devices) => {
                if (working) {
                    hasChange = true;
                }
                return devices
            }
        )
            .pipe(
                filter(() => !working),
                tap(() => working = true),
                flatMap(v => from<Device[]>(v)),
                filter(d => d.status === DeviceStatus.available),
                flatMap((device: Device) => this.jobsService.getDeviceJob(device._ref.id)
                    .pipe(
                        filter(tasks => tasks.length > 0),
                        map(tasks => tasks[0]),
                        flatMap(task => {
                            device.status = DeviceStatus.working;
                            return this.devicesService.updateDevice(device).pipe(map(() => task))
                        })
                    )),
                toArray(),
                tap(() => {
                    working = false;
                    if (hasChange) {
                        changeBehaviour.next("")
                    }
                }),

                flatMap(from),
                flatMap(this.executeTask)
            )

    }

    executeTask(task: JobTask): Observable<any> {
        return null;
//TODO
    }

}
