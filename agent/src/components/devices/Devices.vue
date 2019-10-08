<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <h2 class="pl-title">Devices</h2>
            <md-button class="md-icon-button" v-on:click="switchMode(false)" v-bind:class="{ 'md-primary': !gridMode }">
                <md-icon>list</md-icon>
            </md-button>
            <md-button class="md-icon-button" v-on:click="switchMode(true)" v-bind:class="{ 'md-primary': gridMode }">
                <md-icon>grid_on</md-icon>
            </md-button>
            <list-device :gridMode="gridMode" :devices="devices" :onClickDevice="onDisplayDetail"></list-device>
        </div>
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

        private static GRID_MODE_KEY = 'grid-mode';

        protected gridMode: boolean;
        private devices: Device[] = [];

        constructor() {
            super();
            this.gridMode = this.listModeStatus;
            console.log(this.listModeStatus);
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

        protected switchMode(isGrid: boolean) {
            this.gridMode = isGrid;
            Services.getInstance().store.save(Devices.GRID_MODE_KEY, this.gridMode ? "grid" : "list");
            console.log(this.listModeStatus);
        }

        protected get listModeStatus() {
            let listMode = Services.getInstance().store.load(Devices.GRID_MODE_KEY, "grid");
            return listMode === "grid"
        }
    }
</script>

<style scoped>

</style>
