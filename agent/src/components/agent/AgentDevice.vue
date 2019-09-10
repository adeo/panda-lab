import {AdbStatusState} from "../models/adb";
import {ActionType} from "../services/agent.service";
import {DeviceLogType} from "../models/device";
<template>
    <md-list-item>
        <md-icon>phone_android</md-icon>
        <div class="devices-header-container">
            <h3 class="devices-list-block"><b>{{ device.id }}</b></h3>
            <p class="devices-list-block md-body-1">{{ device.type }} </p>
            <p class="devices-list-block md-body-1">
                <b>
                    {{ (device.enrolled) ? 'Already enroll' : 'Never enroll'}}
                </b>
            </p>
            <p class="devices-logging md-body-1"
               v-bind:style="{'color': (device.logError)? '#D2413A' : '#4caf50'}">
                {{ (device.log != null) ? device.log.value.log : ' ' }}
                <md-tooltip class="md-tooltip">
                    <div v-for="log in deviceLogs">
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
                       v-on:click="enroll(device)">
                Enroll
            </md-button>
            <div class="devices-status"
                 v-bind:style="{'background-color': '#D2413A'}"></div>
        </div>
    </md-list-item>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import {Timestamp} from "rxjs";
    import {DeviceLog, DeviceVue} from "../../models/device";
    import {DeviceAdb} from "../../models/adb";

    @Component
    export default class AgentDevices extends Vue {

        @Prop({ required: true }) device: DeviceVue;
        public deviceLogs: DeviceLog[] = [];

        constructor(props) {
            super(props);
        }

        mounted() {
            let actionLogs = this.device.data.action;
            if (actionLogs) {
                this.deviceLogs = this.device.data.action.getValue().map(value => value.value)
                this.$subscribeTo(actionLogs, (logs: Timestamp<DeviceLog>[]) => {
                    console.log("actionLogs actionLogs actionLogs")
                    this.deviceLogs = logs.map(value => value.value)
                })
            }
        }


        enroll(device: DeviceAdb) {

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

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    /*::ng-deep .mat-tooltip {*/
    /*    white-space: pre-line*/
    /*}*/


    .md-tooltip{
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
