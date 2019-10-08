<template>
    <div class="pl-item" id="item-container">
        <div id="infos-container">
            <md-avatar>
                <md-icon>phone_android</md-icon>
            </md-avatar>
            <div class="md-list-item-text">
                <span class="pl-title">{{ device.name}}</span>
                <span id="device-type">{{ device.type }}</span>
                <div id="status" :class="'status-'+deviceStatus.toLowerCase().replace(/ /g, '-')">
                    <span>{{ deviceStatus }}   </span>
                    <md-progress-spinner v-if="data.action && !data.action.isStopped" class="theme-white"
                                         :md-diameter="9" :md-stroke="2" md-mode="indeterminate"></md-progress-spinner>
                </div>

            </div>

            <md-button v-if="showEnroll" @click="enroll()" class="md-icon-button">
                <md-icon>link</md-icon>
                <md-tooltip class="md-tooltip">Enroll</md-tooltip>
            </md-button>

            <md-button v-if="!showEnroll" @click="updateInfos()" class="md-icon-button">
                <md-icon>update</md-icon>
                <md-tooltip class="md-tooltip">Update phone infos</md-tooltip>
            </md-button>

            <md-button v-if="showTCPConnect" @click="remoteConnect()" class="md-icon-button">
                <md-icon>wifi</md-icon>
                <md-tooltip class="md-tooltip">TCP connect</md-tooltip>
            </md-button>

            <md-button v-if="showTCPEnable" @click="enableTCP()" class="md-icon-button">
                <md-icon>wifi_lock</md-icon>
                <md-tooltip class="md-tooltip">Enable TCP</md-tooltip>
            </md-button>

            <md-button @click="toggleLogs()" class="md-icon-button">
                <md-icon>event_note</md-icon>
                <md-tooltip class="md-tooltip">Logs</md-tooltip>
            </md-button>
        </div>


        <div id="logs-container" :class="showLogs?'':'closed'">
            <div>
                <div class="logs-line md-layout"
                     v-for="(log, index) in deviceLogs"
                     v-bind:key="index">
                    <span class="log-infos">{{formatter.formatHour(new Date(log.timestamp))}}</span>
                    <span class="log-infos" :class="'log-'+log.value.type">{{log.value.type}}:</span>
                    <span class="md-layout-item">{{log.value.log}}</span>
                </div>
                <span v-if="deviceLogs.length === 0">No logs available</span>
            </div>
        </div>

        <!--        <div class="devices-button-container">-->
        <!--            <md-progress-spinner :md-diameter="20" :md-stroke="3" md-mode="indeterminate"-->
        <!--                                 class="devices-loader"-->
        <!--                                 v-if="device.action && !device.action.isStopped"></md-progress-spinner>-->
        <!--            <md-button class="devices-button md-raised md-primary"-->
        <!--                       v-if="!device.enrolled"-->
        <!--                       :disabled="device.action && !device.action.isStopped"-->
        <!--                       v-on:click="enroll()">-->
        <!--                Enroll-->
        <!--            </md-button>-->
        <!--            <div class="devices-status"-->
        <!--                 v-bind:style="{'background-color': !ready ? '#D2413A': used ?'#d28e3c'  : '#4caf50'}"></div>-->
        <!--        </div>-->
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue, Watch} from 'vue-property-decorator';
    import {Timestamp} from "rxjs";
    import {DeviceLog} from "../../models/device";
    import {ActionType, AgentDeviceData, AgentService} from "../../services/agent.service";
    import {DeviceStatus} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class AgentDevice extends Vue {

        @Prop({required: true}) data: AgentDeviceData;

        protected formatter = new DateFormatter();

        public device: DeviceVue;
        public deviceLogs: Timestamp<DeviceLog>[] = [];

        //public deviceLastLog: string = "";
        //public deviceLastLogError: boolean = false;
        private deviceStatus: string;
        private actionTypeLabel: string = "";
        private agentService: AgentService;
        private showLogs = false;

        private showTCPConnect = false;
        private showTCPEnable = false;
        private showEnroll = false;


        @Watch('data', {immediate: true})
        updateView() {
            let deviceId: string = (this.data.adbDevice && this.data.adbDevice.uid) ? this.data.adbDevice.uid : this.data.firebaseDevice ? this.data.firebaseDevice._ref.id : this.data.adbDevice.id;
            this.device = {
                name: this.data.firebaseDevice ? this.data.firebaseDevice.name : this.data.adbDevice.id,
                deviceId: deviceId,
                type: this.data.adbDevice ? this.data.adbDevice.id : this.data.firebaseDevice.ip,
                enrolled: (this.data.firebaseDevice != null),
            };

            this.deviceStatus = "Not enrolled";

            if (this.data.firebaseDevice) {
                switch (this.data.firebaseDevice.status) {
                    case DeviceStatus.offline:
                        this.deviceStatus = "Offline";
                        break;
                    case DeviceStatus.available:
                        this.deviceStatus = "Available";
                        break;
                    case DeviceStatus.working:
                        this.deviceStatus = "Working";
                        break;
                    case DeviceStatus.booked:
                        this.deviceStatus = "Booked";
                        break;

                }
            }
            //console.log("device", this.data.adbDevice)
            //console.log("firebase", this.data.firebaseDevice)

            this.showTCPConnect = this.data.firebaseDevice && this.data.firebaseDevice.status == DeviceStatus.offline && this.data.firebaseDevice.ip !== "" && this.data.firebaseDevice.lastTcpActivation > 0;
            this.showEnroll = this.data.firebaseDevice === undefined;
            this.showTCPEnable = this.data.firebaseDevice && this.data.firebaseDevice.status == DeviceStatus.available && this.data.firebaseDevice.lastTcpActivation <= 0 && this.data.adbDevice.path.startsWith("usb")
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
            if (actionLogs && !actionLogs.isStopped) {
                this.$subscribeTo(actionLogs, (log: Timestamp<DeviceLog>) => {
                    this.deviceLogs = [log].concat(this.deviceLogs);
                    while (this.deviceLogs.length > 10) {
                        this.deviceLogs.pop()
                    }
                })
            }

        }

        constructor(props) {
            super(props);

            this.agentService = Services.getInstance().node.agentService;


        }

        // private refreshLastLog() {
        //     if (this.deviceLogs.length > 0) {
        //         const lastLog = this.deviceLogs[this.deviceLogs.length - 1];
        //         this.deviceLastLog = lastLog.log;
        //         this.deviceLastLogError = lastLog.type == DeviceLogType.ERROR
        //     } else {
        //         this.deviceLastLogError = false;
        //         this.deviceLastLog = "";
        //     }
        // }

        updateInfos() {
            this.agentService.updateDeviceInfos(this.data.firebaseDevice._ref.id)
        }

        enroll() {
            this.agentService.addManualAction({
                actionType: ActionType.enroll,
                adbDevice: this.data.adbDevice,
                firebaseDevice: this.data.firebaseDevice,
                action: null
            });
        }

        remoteConnect() {
            this.agentService.addManualAction({
                actionType: ActionType.try_connect,
                adbDevice: this.data.adbDevice,
                firebaseDevice: this.data.firebaseDevice,
                action: null
            });
        }

        enableTCP() {
            this.agentService.addManualAction({
                actionType: ActionType.enable_tcp,
                adbDevice: this.data.adbDevice,
                firebaseDevice: this.data.firebaseDevice,
                action: null
            });
        }


        toggleLogs() {
            this.showLogs = !this.showLogs;
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
<style scoped lang="scss">

    @import "../../assets/css/theme";

    #device-type {
        color: $text-grey-color
    }

    #status {
        width: auto;
        padding: 3px 8px;
        border-radius: 6px;
        color: white;
        display: inline-block;

        span {
            padding-right: 4px;
        }

        .md-progress-spinner {
            width: auto;
        }

    }

    .log-infos {
        min-width: 55px;
        text-align: center;
    }

    .log-error {
        color: $error-color;
    }

    .log-info {
        color: $success-color;
    }

    .status-available {
        background: $success-color;
    }

    .status-not-enrolled, .status-offline, .status-connect-in-tcp {
        background: $error-color;
    }

    .status-working, .status-booked {
        background: $warn-color;
    }


    #item-container {
        display: flex;
        flex-direction: column;
        overflow: hidden;

    }

    #infos-container {
        display: flex;
        flex-direction: row;
        align-items: center;

        button {
            margin: 0 auto;
        }

    }


    #logs-container {
        color: white;
        background: black;
        margin-bottom: -16px;
        margin-top: 16px;
        transition: max-height 0.26s ease;
        max-height: 100px;
        overflow: scroll;
        display: block;

        > div {
            display: flex;
            flex-direction: column;
            padding: 8px 8px;
        }
    }

    #logs-container.closed {
        max-height: 0;
    }

    /*!*::ng-deep .mat-tooltip {*!*/
    /*!*    white-space: pre-line*!*/
    /*!*}*!*/


    /*.md-tooltip {*/
    /*    height: auto;*/
    /*}*/

    /*.devices-loader {*/
    /*    margin-right: 15px;*/
    /*}*/

    /*.devices-button-container {*/
    /*    display: flex;*/
    /*    align-items: center;*/
    /*}*/

    /*.devices-header-container {*/
    /*    flex: 1;*/
    /*    overflow: hidden;*/
    /*}*/

    /*.devices-list-block {*/
    /*    display: block;*/
    /*    margin: 0;*/
    /*    padding: 0;*/
    /*}*/

    /*.devices-logging {*/
    /*    display: block;*/
    /*    margin: 0;*/
    /*    padding: 0;*/
    /*    width: 250px;*/
    /*    overflow: hidden;*/
    /*    white-space: nowrap;*/
    /*    text-overflow: ellipsis;*/
    /*}*/

    /*.devices-status {*/
    /*    width: 20px;*/
    /*    height: 20px;*/
    /*    border-radius: 50%;*/
    /*    margin-left: 10px;*/
    /*}*/
</style>
