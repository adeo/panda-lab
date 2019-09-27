import {ActionType} from "../../services/agent.service";
import {DeviceLogType} from "../../models/device";
import {AdbStatusState} from "../models/adb";
import {ActionType} from "../services/agent.service";
import {DeviceLogType} from "../models/device";
<template>
    <md-list-item>
        <md-icon>phone_android</md-icon>
        <div class="devices-header-container">
            <h3 class="devices-list-block"><b>{{ device.name + " - " +device.deviceId }}</b></h3>
            <p class="devices-list-block md-body-1">{{ device.type }} </p>
            <p class="devices-list-block md-body-1">
                <b>
                    {{ deviceStatus }}
                </b>
            </p>
            <p class="devices-logging md-body-1" v-bind:style="{'color': (deviceLastLogError)? '#D2413A' : '#4caf50'}">
                {{ (actionTypeLabel) ? actionTypeLabel : ' ' }}
                <md-tooltip class="md-tooltip">
                    <div v-for="log in deviceLogs" v-bind:key="log.log">
                        {{ log.log }}
                    </div>
                </md-tooltip>
            </p>
        </div>
        <div class="devices-button-container">
            <md-progress-spinner :md-diameter="20" :md-stroke="3" md-mode="indeterminate"
                                 class="devices-loader"
                                 v-if="device.action && !device.action.isStopped"></md-progress-spinner>
            <md-button class="devices-button md-raised md-primary"
                       v-if="!device.enrolled"
                       :disabled="device.action && !device.action.isStopped"
                       v-on:click="enroll()">
                Enroll
            </md-button>
            <div class="devices-status"
                 v-bind:style="{'background-color': !ready ? '#D2413A': used ?'#d28e3c'  : '#4caf50'}"></div>
        </div>
    </md-list-item>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import {Timestamp} from "rxjs";
    import {DeviceLog, DeviceLogType} from "../../models/device";
    import {DeviceAdb} from "../../models/adb";
    import {ActionType, AgentDeviceData, AgentService} from "../../services/agent.service";
    import {DeviceStatus} from "pandalab-commons";
    import {Services} from "../../services/services.provider";

    @Component
    export default class AgentDevices extends Vue {

        @Prop({required: true}) data: AgentDeviceData;

        public device: DeviceVue;
        public deviceLogs: DeviceLog[] = [];

        public deviceLastLog: string = "";
        public deviceLastLogError: boolean = false;
        private ready: boolean;
        private deviceStatus: string;
        private used: boolean;
        private actionTypeLabel: string = "";
        private agentService: AgentService;

        constructor(props) {
            super(props);

            this.agentService = Services.getInstance().node.agentService;
            let deviceId: string = (this.data.adbDevice && this.data.adbDevice.uid) ? this.data.adbDevice.uid : this.data.firebaseDevice ? this.data.firebaseDevice._ref.id : this.data.adbDevice.id;
            this.device = {
                name: this.data.firebaseDevice ? this.data.firebaseDevice.name : this.data.adbDevice.type,
                deviceId: deviceId,
                type: this.data.adbDevice ? this.data.adbDevice.id : this.data.firebaseDevice.ip,
                enrolled: (this.data.firebaseDevice != null),
            };

            this.ready = false;
            this.used = false;
            this.deviceStatus = "Not enrolled";

            if (this.data.firebaseDevice) {
                switch (this.data.firebaseDevice.status) {
                    case DeviceStatus.offline:
                        this.deviceStatus = "Offline";
                        break;
                    case DeviceStatus.available:
                        this.deviceStatus = "Available";
                        this.ready = true;
                        break;
                    case DeviceStatus.working:
                        this.deviceStatus = "Working";
                        this.ready = true;
                        this.used = true;
                        break;
                    case DeviceStatus.booked:
                        this.deviceStatus = "Booked";
                        this.ready = true;
                        this.used = true;
                        break;

                }
            }

        }

        mounted() {

            this.actionTypeLabel = "";
            switch (this.data.actionType) {
                case ActionType.enroll:
                    this.actionTypeLabel = "Enroll";
                    break;
                case ActionType.try_connect:
                    this.actionTypeLabel = "Connect in tcp";
                    break;
                case ActionType.update_status:
                    this.actionTypeLabel = "Update device status";
                    break;
                case ActionType.none:
                    break;
                case ActionType.enable_tcp:
                    this.actionTypeLabel = "Enable tcp";
                    break
            }

            let actionLogs = this.data.action;
            if (actionLogs) {
                this.deviceLogs = this.data.action.getValue().map(value => value.value);
                this.refreshLastLog()
                this.$subscribeTo(actionLogs, (logs: Timestamp<DeviceLog>[]) => {
                    this.deviceLogs = logs.map(value => value.value);
                    this.refreshLastLog()
                })
            }
        }

        private refreshLastLog() {
            if (this.deviceLogs.length > 0) {
                const lastLog = this.deviceLogs[this.deviceLogs.length - 1];
                this.deviceLastLog = lastLog.log;
                this.deviceLastLogError = lastLog.type == DeviceLogType.ERROR
            } else {
                this.deviceLastLogError = false;
                this.deviceLastLog = "";
            }
        }

        enroll() {
            this.agentService.addManualAction({
                actionType: ActionType.enroll,
                adbDevice: this.data.adbDevice,
                firebaseDevice: this.data.firebaseDevice,
                action: null
            });
        }

        getDateFromTimestamp(timestamp: number): string {
            const d = new Date(timestamp);

            const day = d.getDate();
            const month = d.getMonth() + 1;
            const year = d.getFullYear();

            const hours = d.getHours();
            const minutes = d.getMinutes();
            const seconds = d.getSeconds();

            return `${hours <= 9 ? '0' + hours : hours}:${minutes <= 9 ? '0' + minutes : minutes}:${seconds <= 9 ? '0' + seconds : seconds}`;
        }


    }


    interface DeviceVue {
        name: string,
        deviceId: string,
        type: string,
        enrolled: boolean,
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    /*::ng-deep .mat-tooltip {*/
    /*    white-space: pre-line*/
    /*}*/


    .md-tooltip {
        height: auto;
    }

    .devices-loader {
        margin-right: 15px;
    }

    .devices-button-container {
        display: flex;
        align-items: center;
    }

    .devices-header-container {
        flex: 1;
        overflow: hidden;
    }

    .devices-list-block {
        display: block;
        margin: 0;
        padding: 0;
    }

    .devices-logging {
        display: block;
        margin: 0;
        padding: 0;
        width: 250px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .devices-status {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        margin-left: 10px;
    }
</style>
