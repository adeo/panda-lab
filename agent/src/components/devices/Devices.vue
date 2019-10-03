<template>
    <div>
        <h2 class="devices-home-title md-display-1">Devices:</h2>
        <md-button class="md-icon-button" v-on:click="gridMode = false; onListMode();" v-bind:class="{ 'md-primary': !gridMode }">
            <md-icon>list</md-icon>
        </md-button>
        <md-button class="md-icon-button" v-on:click="gridMode = true; onListMode();" v-bind:class="{ 'md-primary': gridMode }">
            <md-icon>grid_on</md-icon>
        </md-button>
        <list-device :gridMode="gridMode" :devices="devices" :onClickDevice="onDisplayDetail"></list-device>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import ListDevice from "../ListDevice.vue";
    import {Device} from "pandalab-commons";

    @Component({
        components: {ListDevice}
    })
    export default class Devices extends Vue {

        static LIST_MODE_KEY = 'listKey';

        protected gridMode: boolean;
        private devices: Device[] = [];

        constructor() {
            super();
            this.gridMode = this.listModeStatus;
        }

        mounted() {
            const devicesAsync = Services.getInstance().devicesService.listenDevices();
            this.$subscribeTo(devicesAsync, devices => {
                this.devices = devices;
            });
        }

        protected onDisplayDetail(device: any) {
            this.$router.push('/devices/' + device._ref.id);
        }

        protected onListMode() {
            Services.getInstance().store.save(Devices.LIST_MODE_KEY, this.gridMode ? "list" : "grid");
        }

        protected get listModeStatus() {
            let listMode = Services.getInstance().store.load(Devices.LIST_MODE_KEY, "list");
            return listMode == "grid"
        }
    }
</script>

<style scoped>

    .devices-home-title {
        margin: 15px;
        color: white;
    }
</style>
