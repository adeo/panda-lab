<template>
    <div>
        <div class="md-layout">
            <div class="md-layout-item pl-container">
                <div class="md-layout md-alignment-center-center">
                    <div class="md-layout-item-5">
                        <md-button class="md-icon-button" @click="$router.back()">
                            <md-icon>arrow_back</md-icon>
                        </md-button>
                    </div>
                    <h2 class="md-layout-item pl-title">
                        Agent detail
                    </h2>
                </div>
                <p>{{ this.agentId }}</p>
                <md-button class="md-icon-button" v-on:click="gridMode = false"
                           v-bind:class="{ 'md-primary': !gridMode }">
                    <md-icon>list</md-icon>
                </md-button>
                <md-button class="md-icon-button" v-on:click="gridMode = true"
                           v-bind:class="{ 'md-primary': gridMode }">
                    <md-icon>grid_on</md-icon>
                </md-button>
                <list-device :deleteMode="true" :gridMode="gridMode" :devices="selectedDevices"
                             :onDeleteDevice="showDialogDeleteDevice"></list-device>
            </div>
            <md-dialog-confirm
                :md-active.sync="deleteDeviceDialog.show"
                md-title="Delete the device?"
                md-confirm-text="Delete"
                md-cancel-text="No"
                @md-cancel="deleteDeviceDialog.show = false"
                @md-confirm="onDeleteDevice(deleteDeviceDialog.device)"/>
        </div>
    </div>
</template>

<script lang="ts">
    import {AgentModel, Device} from 'pandalab-commons'
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";
    import ListDevice from "../ListDevice.vue";

    @Component({
        components: {ListDevice}
    })
    export default class AgentDetail extends Vue {

        gridMode = true;
        agent: AgentModel = null;
        devices: Device[] = [];
        selectedDevices: Device[] = [];
        deleteDeviceDialog: any = {
            show: false,
            device: null
        };

        protected formatter = new DateFormatter();

        protected get agentId() {
            return this.$route.params.agentId;
        }

        mounted() {
            this.$subscribeTo(Services.getInstance().agentsService.listenAgentDevices(this.$route.params.agentId), agentDevices => {
                this.$subscribeTo(Services.getInstance().devicesService.listenDevices(), devices => {
                    console.log('selected devices : ' + agentDevices.length);
                    console.log('total devices : ' + devices.length);
                    this.selectedDevices = agentDevices.map(agentDevice => devices.find(d => d._ref.id === agentDevice._ref.id)).filter(value => value !== null);
                    this.devices = devices;
                });

            });
        }

        protected onSelect(items) {
            this.selectedDevices = items;
        }


        showDialogDeleteDevice(device: Device) {
            this.deleteDeviceDialog.device = device;
            this.deleteDeviceDialog.show = true;
        }

        protected onDeleteDevice(device: Device) {
            this.deleteDeviceDialog.show = false;
            this.$subscribeTo(Services.getInstance().devicesService.deleteAgent(device), device => {
                console.log("device deleted");
            }, error => {
                console.error(error);
            });
        }

    }
</script>

<style scoped>

</style>
