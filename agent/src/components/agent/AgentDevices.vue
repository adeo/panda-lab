<template>

    <div class="md-layout">

        <div class="md-layout-item md-size-60 pl-container">

        </div>

        <div id="options" class="md-layout-item md-size-40 pl-theme-grey pl-container">
            <h2 class="pl-title">Stats</h2>


            <md-list>
                <md-list-item>
                    <span class="md-list-item-text">Adb status : </span>
                    <span id="adb-status" class="md-list-action" :class="'adb-status-'+adbStatus.toLowerCase()">{{adbStatus}}</span>
                </md-list-item>

                <md-list-item>
                    <span class="md-list-item-text">Number of connected devices : </span>
                    <span class="md-list-action">{{devicesCount}}/{{totalDevicesCount}}</span>
                </md-list-item>


            </md-list>

            <div class="spacer pl-hide-small"></div>

            <md-list>
                <md-list-item>
                    <md-switch class="md-primary" v-model="autoEnrollSwitch" @change="autoEnrollActivation()">Auto
                        enrollment
                    </md-switch>
                </md-list-item>
                <md-list-item>
                    <md-switch class="md-primary" v-model="enableTcpIpSwitch" @change="enableTcpIpActivaton()">
                        Enable
                        TCP/IP
                    </md-switch>
                </md-list-item>
            </md-list>

        </div>


<!--        <div class="devices-container">-->
<!--            <div class="devices-list-container md-elevation-4">-->
<!--                <h2 class="md-display-1">List of connected devices:</h2>-->
<!--                <md-list>-->
<!--                    <AgentDevice v-for="device in devicesVue"-->
<!--                                 v-bind:key="device.key"-->
<!--                                 :data="device"/>-->
<!--                </md-list>-->
<!--            </div>-->
<!--            <div class="devices-infos-container md-elevation-4">-->
<!--                <h2 class="md-display-1">Infos status:</h2>-->
<!--                <h3 class="md-body-1">Number of available devices:</h3>-->
<!--                <h2 class="md-display-1"><b>{{ devicesCount }}</b></h2>-->
<!--                <h3 class="md-body-1">ADB Status:</h3>-->
                <!--                <h2 class="devices-adb-status-listen md-display-1"-->
                <!--                    v-if="(adbStatus.state === adbStateEnum.STARTED)"><b>Listening</b>-->
                <!--                </h2>-->
                <!--                <div class="devices-adb-status-stop-container"-->
                <!--                     v-if="(adbStatus.state === adbStateEnum.STOPPED || adbStatus.state === adbStateEnum.LOADING)">-->
                <!--                    <h2 class="devices-adb-status-stop md-display-1"><b>Stopped</b></h2>-->
                <!--                    <md-button class="devices-restart-adb md-raised md-primary"-->
                <!--                               :disabled="(adbStatus.state === adbStateEnum.LOADING)"-->
                <!--                               v-on:click="adb.restartAdbTracking()">Restart-->
                <!--                    </md-button>-->
                <!--                    <md-progress-spinner :md-diameter="20" :md-stroke="3" md-mode="indeterminate"-->
                <!--                                         class="devices-restart-adb-loader"-->
                <!--                                         v-if="(adbStatus.state === adbStateEnum.LOADING)"></md-progress-spinner>-->
                <!--                </div>-->
<!--            </div>-->
<!--            <div class="devices-settings-container md-elevation-4">-->
<!--                <h2 class="md-display-1">Settings:</h2>-->
<!--                <md-list>-->
<!--                    <md-list-item>-->
<!--                        <md-switch class="md-primary" v-model="autoEnrollSwitch" @change="autoEnrollActivation()">Auto-->
<!--                            enrollment-->
<!--                        </md-switch>-->
<!--                    </md-list-item>-->
<!--                    <md-list-item>-->
<!--                        <md-switch class="md-primary" v-model="enableTcpIpSwitch" @change="enableTcpIpActivaton()">-->
<!--                            Enable-->
<!--                            TCP/IP-->
<!--                        </md-switch>-->
<!--                    </md-list-item>-->
<!--                </md-list>-->
<!--            </div>-->
<!--        </div>-->
    </div>


</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {Subscription} from 'vue-rx-decorators';
    import {AdbStatusState} from "../../models/adb";
    import {DeviceLog} from "../../models/device";
    import {Services} from "../../services/services.provider";
    import {DevicesService} from "../../services/devices.service";
    import {AgentDeviceData, AgentService} from "../../services/agent.service";
    import {AdbService} from "../../services/node/adb.service";
    import {EMPTY, Observable, Timestamp} from "rxjs";
    import AgentDevice from "./AgentDevice.vue";
    import {DeviceStatus} from "pandalab-commons";

    @Component({
        components: {AgentDevice},
    })
    export default class AgentDevices extends Vue {

        totalDevicesCount: number = 0;
        devicesCount: number = 0;

        autoEnrollSwitch: boolean = false;
        enableTcpIpSwitch: boolean = false;


        private devicesService: DevicesService;
        private agentService: AgentService;
        private adb: AdbService;

        public devicesVue: AgentDeviceData[] = [];
        public adbStatus: string = AdbStatusState.LOADING;


        constructor(props) {
            super(props);
            this.devicesService = Services.getInstance().devicesService;
            this.agentService = Services.getInstance().node.agentService;
            this.adb = this.agentService.adbRepo;
            this.enableTcpIpSwitch = this.agentService.enableTCP;
            this.autoEnrollSwitch = this.agentService.autoEnroll;
        }

        mounted() {
            let devicesDataObs = this.agentService.listenAgentDevices();
            this.$subscribeTo(devicesDataObs, (devicesData: AgentDeviceData[]) => {
                this.totalDevicesCount = devicesData.length;
                this.devicesCount = devicesData.filter(value => value.firebaseDevice && value.firebaseDevice.status == DeviceStatus.available).length;
                this.devicesVue = devicesData.map(value => {

                    value['key'] = value.actionType + (value.adbDevice ? value.adbDevice.id : "") + (value.firebaseDevice ? value.firebaseDevice._ref.id : "")
                    return value
                })
            });

            this.$subscribeTo(this.adb.listenAdbStatus(), t => {
                switch (t.state) {
                    case AdbStatusState.LOADING:
                        this.adbStatus = "Loading";
                        break;
                    case AdbStatusState.STOPPED:
                        this.adbStatus = "Stopped";
                        break;
                    case AdbStatusState.STARTED:
                        this.adbStatus = "Listening";
                        break;
                }
            })
        }

        @Subscription()
        listenDeviceLogs(device: AgentDeviceData): Observable<Timestamp<DeviceLog>[]> {
            return device && device.action ? device.action : EMPTY;
        }


        autoEnrollActivation() {
            this.agentService.autoEnroll = this.autoEnrollSwitch
            console.log('autoEnroll', this.autoEnrollSwitch)
        }

        enableTcpIpActivaton() {
            this.agentService.enableTCP = this.enableTcpIpSwitch
        }


    }


</script>

<style scoped lang="scss">

    @import "../../assets/css/theme";

    #options {
        height: 100%;
        display: flex;
        flex-direction: column;

        .spacer{
            flex: 1;
        }

        .md-list {
            background: transparent;
        }
        .md-list-item-content span{
            white-space: normal;
        }
    }


    .adb-status-listening {
        color: $success-color;
    }

    .adb-status-stopped {
        color: $error-color;
    }

    .adb-status-loading {
        color: $warm-color;
    }



    .devices-container {
        padding: 10px;
    }

    .devices-list-container {
        width: 500px;
        background-color: #fff;
        padding: 10px 15px 10px 15px;
        border-radius: 5px;
        margin: 10px;
        float: left;
    }

    .devices-infos-container {
        width: 400px;
        background-color: #fff;
        padding: 10px 10px 10px 20px;
        border-radius: 5px;
        margin: 10px;
        float: left;
    }

    .devices-settings-container {
        width: 400px;
        background-color: #fff;
        padding: 10px 10px 10px 20px;
        border-radius: 5px;
        margin: 10px;
        float: left;
    }

    .devices-adb-status-listen {
        color: #4caf50;
    }

    .devices-adb-status-stop {
        color: #D2413A;
        margin-right: 15px;
    }

    .devices-restart-adb {
        margin-right: 15px;
    }

    .devices-adb-status-stop-container {
        display: flex;
        align-items: center;
    }

</style>
