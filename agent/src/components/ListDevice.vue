<template>
    <div class="devices-container">
        <div class="devices-list-container md-elevation-4">
            <h2 class="md-display-1">List of connected devices:</h2>
            <md-list>
                <md-list-item v-for="device in devices" v-bind:key="device.id">
                    <md-icon>phone_android</md-icon>
                    <div class="devices-header-container">
                        <h3 class="devices-list-block"><b>{{ device.id }}</b></h3>
                        <p class="devices-list-block md-body-1">{{ device.type }} / {{ device.path }}</p>
                        <p class="devices-list-block md-body-1">
                            <b>
                                {{ (device.deviceState === deviceState.UPDATED || device.deviceState ===
                                deviceState.ENROLL)
                                ? 'Already enroll' : 'Never enroll'}}
                            </b>
                        </p>
                        <p class="devices-logging md-body-1"
                           v-bind:style="{'color': (device.deviceLogs != null && getLastLog(device).value.type === deviceLogType.ERROR)? '#D2413A' : '#4caf50'}">
                            {{ (device.deviceLogs != null) ? getLastLog(device).value.log : ' ' }}
                            <md-tooltip class="md-tooltip">
                                <div v-for="log in showDeviceLogs(device)" v-bind:key="log">
                                    {{ log }}
                                </div>
                            </md-tooltip>
                        </p>
                    </div>
                    <div class="devices-button-container">
                        <md-progress-spinner :md-diameter="20" :md-stroke="3" md-mode="indeterminate"
                                             class="devices-loader"
                                             v-if="getDeviceStatus(device.id)"></md-progress-spinner>
                        <md-button class="devices-button md-raised md-primary"
                                   v-if="!(device.deviceState === deviceState.UPDATED)"
                                   :disabled="getDeviceStatus(device.id)"
                                   v-on:click="enroll(device)">{{ (device.deviceState === deviceState.ENROLL) ? 'Update'
                            : 'Enroll' }}
                        </md-button>
                        <div class="devices-status"
                             v-bind:style="{'background-color': (device.deviceState === deviceState.UPDATED || device.deviceState === deviceState.ENROLL)? '#4caf50' : '#D2413A'}"></div>
                    </div>
                </md-list-item>
            </md-list>
        </div>
        <div class="devices-infos-container md-elevation-4">
            <h2 class="md-display-1">Infos status:</h2>
            <h3 class="md-body-1">Number of connected devices:</h3>
            <h2 class="md-display-1"><b>{{ devicesCount }}</b></h2>
            <h3 class="md-body-1">ADB Status:</h3>
            <h2 class="devices-adb-status-listen md-display-1" v-if="(adbStatus.state === adbStateEnum.STARTED)"><b>Listening</b>
            </h2>
            <div class="devices-adb-status-stop-container"
                 v-if="(adbStatus.state === adbStateEnum.STOPPED || adbStatus.state === adbStateEnum.LOADING)">
                <h2 class="devices-adb-status-stop md-display-1"><b>Stopped</b></h2>
                <md-button class="devices-restart-adb md-raised md-primary"
                           :disabled="(adbStatus.state === adbStateEnum.LOADING)"
                           v-on:click="restartAdbTracking()">Restart
                </md-button>
                <md-progress-spinner :md-diameter="20" :md-stroke="3" md-mode="indeterminate"
                                     class="devices-restart-adb-loader"
                                     v-if="(adbStatus.state === adbStateEnum.LOADING)"></md-progress-spinner>
            </div>
        </div>
        <div class="devices-settings-container md-elevation-4">
            <h2 class="md-display-1">Settings:</h2>
            <md-list>
                <md-list-item>
                    <md-switch class="md-primary" v-model="autoEnrollSwitch" @change="autoEnrollActivation()">Auto
                        enrollment
                    </md-switch>
                </md-list-item>
                <md-list-item>
                    <md-switch class="md-primary" v-model="enableTcpIpSwitch" @change="enableTcpIpActivaton()">Enable
                        TCP/IP
                    </md-switch>
                </md-list-item>
            </md-list>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {Subscription} from 'vue-rx-decorators';
    import 'rxjs/Rx';
    import {adbService} from "@/services/adb.service";
    import {flatMap, map} from "rxjs/operators";
    import {from, Subscription as Sub, Timestamp} from "rxjs";
    import {AdbStatusState, DeviceAdb} from "@/models/adb";
    import {DeviceLog, DeviceLogType} from "@/models/device";
    import {DeviceState} from "@/models/firebase";
    import {deviceService} from "@/services/device.service";
    import {storageUtils} from "@/utils/storage.utils";

    @Component
    export default class ListDevice extends Vue {

        static AUTO_ENROLL_KEY = 'autoEnroll';
        static ENABLE_TCP_IP = 'enableTcpIp';

        devicesTcpIp: Sub;
        devicesAutoEnroll: Sub;

        devicesCount: number = 0;

        devicesStatus = new Map<string, DeviceAdb>();
        adbStateEnum: typeof AdbStatusState = AdbStatusState;
        deviceState: typeof DeviceState = DeviceState;
        deviceLogType: typeof DeviceLogType = DeviceLogType;

        autoEnrollSwitch: boolean = this.getAutoEnrollButtonState();
        enableTcpIpSwitch: boolean = this.getEnableTcpIpButtonState();

        @Subscription()
        protected get devices() {
            return adbService
                .listenAdb()
                .do(devices => {
                    console.log(`Total devices : ${devices.length}`);
                    this.devicesCount = devices.length;
                    this.$forceUpdate();
                });
        }

        @Subscription()
        protected get adbStatus() {
            return adbService.listenAdbStatus();
        }

        enroll(device: DeviceAdb) {
            device.deviceLogs = [];
            this.addDeviceStatus(device);
            deviceService.enroll(device.id)
                .subscribe((deviceLog) => {
                        console.log(deviceLog);
                        device.deviceLogs.push(deviceLog);
                        this.$forceUpdate()
                    },
                    (error) => {
                        console.error('Enrollment error', error);
                        this.removeDeviceStatus(device);
                        this.$forceUpdate()
                    },
                    () => {
                        console.log('Enrollment complete');
                        device.deviceState = DeviceState.UPDATED;
                        this.removeDeviceStatus(device);
                        this.$forceUpdate()
                    }
                );
        }

        getDeviceStatus(deviceId: string): boolean {
            return this.devicesStatus.get(deviceId) != null;
        }

        addDeviceStatus(device: DeviceAdb) {
            this.devicesStatus.set(device.id, device);
        }

        removeDeviceStatus(device: DeviceAdb) {
            this.devicesStatus.delete(device.id);
        }

        restartAdbTracking() {
            adbService.restartAdbTracking();
        }

        autoEnrollActivation() {
            this.autoEnroll(this.autoEnrollSwitch)
        }

        autoEnroll(enable: boolean) {
            if (enable) {
                storageUtils.setItemInStorage(ListDevice.AUTO_ENROLL_KEY, true);

                adbService.listenAdb().pipe(
                    flatMap(devices => {
                        return from(devices).pipe(
                            map(device => {
                                if (device.deviceState !== DeviceState.UPDATED) {
                                    this.enroll(device);
                                }
                                return device;
                            })
                        );
                    })
                ).subscribe((device) => {
                        console.log(device);
                    },
                    (error) => {
                        console.error('Error auto-enroll', error);
                    },
                    () => {
                        console.log('Auto-enroll complete');
                    }
                );
            } else {
                storageUtils.setItemInStorage(ListDevice.AUTO_ENROLL_KEY, false);

                if (this.devicesAutoEnroll != null) {
                    this.devicesAutoEnroll.unsubscribe();
                }
            }
        }

        enableTcpIpActivaton() {
            this.enableTcpIp(this.enableTcpIpSwitch)
        }

        enableTcpIp(enable: boolean) {
            if (enable) {
                storageUtils.setItemInStorage(ListDevice.ENABLE_TCP_IP, true);

                adbService.listenAdb().pipe(
                    flatMap(devices => {
                        return from(devices).pipe(
                            flatMap(device => {
                                return adbService.enableTcpIp(device.id);
                            })
                        );
                    })
                ).subscribe((port) => {
                        console.log(port);
                    },
                    (error) => {
                        console.error('Error enable TCP/IP', error);
                    },
                    () => {
                        console.log('Enable TCP/IP complete');
                    }
                );
            } else {
                storageUtils.setItemInStorage(ListDevice.ENABLE_TCP_IP, false);

                if (this.devicesTcpIp != null) {
                    this.devicesTcpIp.unsubscribe();
                }
            }
        }

        getLastLog(device: DeviceAdb): Timestamp<DeviceLog> {
            return device.deviceLogs[device.deviceLogs.length - 1];
        }

        showDeviceLogs(device: DeviceAdb): Array<string> {
            const instance = this;
            let deviceLogs: Array<string> = [];
            if (device.deviceLogs != null) {
                device.deviceLogs.forEach(function (logs) {
                    deviceLogs.push('[' + instance.getDateFromTimestamp(logs.timestamp) + ']: ' + logs.value.log + '\n');
                });

            }
            return deviceLogs;
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

        getAutoEnrollButtonState(): boolean {
            if(storageUtils.getItemFromStorage(ListDevice.AUTO_ENROLL_KEY) == null) {
                storageUtils.setItemInStorage(ListDevice.AUTO_ENROLL_KEY, false);
            }

            if (this.devicesAutoEnroll == null) {
                this.autoEnroll(storageUtils.getItemFromStorage(ListDevice.AUTO_ENROLL_KEY));
            }

            return storageUtils.getItemFromStorage(ListDevice.AUTO_ENROLL_KEY);
        }

        getEnableTcpIpButtonState(): boolean {
            if(storageUtils.getItemFromStorage(ListDevice.ENABLE_TCP_IP) == null) {
                storageUtils.setItemInStorage(ListDevice.ENABLE_TCP_IP, false);
            }

            if (this.devicesTcpIp == null) {
                this.enableTcpIp(storageUtils.getItemFromStorage(ListDevice.ENABLE_TCP_IP));
            }

            return storageUtils.getItemFromStorage(ListDevice.ENABLE_TCP_IP);
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    /*::ng-deep .mat-tooltip {*/
    /*    white-space: pre-line*/
    /*}*/

    .md-tooltip {
        height: auto
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

    .devices-loader {
        margin-right: 15px;
    }

    .devices-button-container {
        display: flex;
        align-items: center;
    }

    .devices-header-container {
        flex: 1;
        overflow: auto;
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

    .devices-status {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        margin-left: 10px;
    }
</style>
