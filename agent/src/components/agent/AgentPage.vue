<template>

    <div class="md-layout">

        <div class="md-layout-item md-small-hide md-size-60 pl-container">
            <AgentDevicesList :devices="devicesVue"></AgentDevicesList>
        </div>

        <div id="options" class="md-layout-item md-small-size-100 md-size-40 pl-theme-grey pl-container">
            <div id="title-container" class="md-layout md-alignment-center-left">
                <h2 class="pl-title md-layout-item">Stats</h2>
                <md-button @click="reloadAdb()" class="md-icon-button md-dense md-raised md-primary">
                    <md-icon :class="adbStatus.toLowerCase() === 'loading' ? 'rotate' : ''">cached</md-icon>
                </md-button>
            </div>

            <md-list>
                <md-list-item>
                    <span class="md-list-item-text">Adb status : </span>
                    <span id="adb-status" class="md-list-action" :class="'adb-status-'+adbStatus.toLowerCase()">
                        {{adbStatus}}
                    </span>

                </md-list-item>

                <md-list-item>
                    <span class="md-list-item-text">Available devices : </span>
                    <span class="md-list-action">{{devicesCount}} / {{totalDevicesCount}}</span>
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

        <div class="md-layout-item md-small-100 pl-show-small pl-container">
            <AgentDevicesList :devices="devicesVue"></AgentDevicesList>
        </div>
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
    import {DeviceStatus} from "pandalab-commons";
    import AgentDevicesList from "./AgentDevicesList.vue";

    @Component({
        components: {AgentDevicesList},
    })
    export default class AgentPage extends Vue {

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
            this.adb = this.agentService.adb;
            this.enableTcpIpSwitch = this.agentService.enableTCP;
            this.autoEnrollSwitch = this.agentService.autoEnroll;
        }

        mounted() {
            let devicesDataObs = this.agentService.listenAgentDevices();
            this.$subscribeTo(devicesDataObs, (devicesData: AgentDeviceData[]) => {
                this.totalDevicesCount = devicesData.length;
                this.devicesCount = devicesData.filter(value => value.firebaseDevice && value.firebaseDevice.status == DeviceStatus.available).length;
                this.devicesVue = devicesData.map(value => {
                    value['key'] = value.firebaseDevice ? value.firebaseDevice._ref.id : value.adbDevice.id;
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

        reloadAdb() {
            this.agentService.reloadAdb()
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

        .spacer {
            flex: 1;
        }

        .md-list {
            background: transparent;
        }

        .md-list-item-content span {
            white-space: normal;
        }
    }

    #title-container {
        flex: 0;
    }


    @media (max-width: $small-screen-size) {
        #options {
            height: auto;
        }
    }


    .adb-status-listening {
        color: $success-color;
    }

    .adb-status-stopped {
        color: $error-color;
    }

    .adb-status-loading {
        color: $warn-color;
    }


    /*.devices-container {*/
    /*    padding: 10px;*/
    /*}*/

    /*.devices-list-container {*/
    /*    width: 500px;*/
    /*    background-color: #fff;*/
    /*    padding: 10px 15px 10px 15px;*/
    /*    border-radius: 5px;*/
    /*    margin: 10px;*/
    /*    float: left;*/
    /*}*/

    /*.devices-infos-container {*/
    /*    width: 400px;*/
    /*    background-color: #fff;*/
    /*    padding: 10px 10px 10px 20px;*/
    /*    border-radius: 5px;*/
    /*    margin: 10px;*/
    /*    float: left;*/
    /*}*/

    /*.devices-settings-container {*/
    /*    width: 400px;*/
    /*    background-color: #fff;*/
    /*    padding: 10px 10px 10px 20px;*/
    /*    border-radius: 5px;*/
    /*    margin: 10px;*/
    /*    float: left;*/
    /*}*/

    /*.devices-adb-status-listen {*/
    /*    color: #4caf50;*/
    /*}*/

    /*.devices-adb-status-stop {*/
    /*    color: #D2413A;*/
    /*    margin-right: 15px;*/
    /*}*/

    /*.devices-restart-adb {*/
    /*    margin-right: 15px;*/
    /*}*/

    /*.devices-adb-status-stop-container {*/
    /*    display: flex;*/
    /*    align-items: center;*/
    /*}*/

</style>
