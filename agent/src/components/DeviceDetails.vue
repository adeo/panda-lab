<template>
    <div id="device-details">
        <md-dialog :md-active="showDeviceDetailsDialog" style="padding: 24px; min-width: 50%;">
            <md-dialog-title>{{ device.name }}</md-dialog-title>
            <div class="device-details-header">
                <img class="devices-details-header-icon" :src="device.pictureIcon ? device.pictureIcon : require('../assets/images/device.png')">
                <div class="device-details-header-infos-container">
                    <div class="device-details-header-infos">
                        <p><b>Service Version:</b></p>
                        <p>{{ device.currentServiceVersion }}</p>
                    </div>
                    <div class="device-details-header-infos">
                        <p><b>Android Version:</b></p>
                        <p>{{ device.phoneAndroidVersion }}</p>
                    </div>
                    <div class="device-details-header-infos">
                        <p><b>Brand:</b></p>
                        <p>{{ device.phoneBrand }}</p>
                    </div>
                </div>
            </div>
            <div class="device-details-jobs">

            </div>
            <md-dialog-actions>
                <md-button class="md-primary" @click="showDeviceDetailsDialog = false">Close</md-button>
            </md-dialog-actions>
        </md-dialog>
    </div>
</template>

<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import {Device} from "@/models/device"
    import {DEVICE_DETAILS_EVENT_DISPLAY} from "@/components/events";

    @Component
    export default class DeviceDetails extends Vue {

        showDeviceDetailsDialog: boolean = false;
        device: Device;

        constructor() {
            super();
        }

        created() {
            this.$parent.$on(DEVICE_DETAILS_EVENT_DISPLAY, (device) => {
                this.showDeviceDetailsDialog = true;
                this.device = device;
            });
        }
    }

</script>

<style scoped>
    .device-details-header {
        height: 70px;
        border-radius: 10px;
        background-color: #e8eef7;
    }
    .devices-details-header-icon {
        display: inline-block;
        height: 70px;
        padding: 5px;
    }
    .device-details-header-infos-container {
        display: inline-block;
        height: 70px;
        vertical-align: middle;
    }
    .device-details-header-infos {
        display: block;
        vertical-align: middle;
    }
    .device-details-header-infos * {
        display: inline-block;
        padding: 0;
        margin: 0 0 0 5px;
    }
    .device-details-jobs {
        height: 300px;
        border-radius: 10px;
        background-color: #e8eef7;
        margin-top: 10px;
    }
</style>
