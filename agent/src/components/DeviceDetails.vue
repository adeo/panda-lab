<template>
    <div id="device-details">
        <md-dialog :md-active="showDeviceDetailsDialog" style="padding: 24px; min-width: 50%;">
            <md-dialog-title>{{ device.name }}</md-dialog-title>
            <div>

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

</style>
