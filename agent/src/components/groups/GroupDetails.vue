<template>
    <div>


        <template v-if="group">

            <md-toolbar>
                <md-button class="md-icon-button" @click="onBack()">
                    <md-icon>arrow_back</md-icon>
                </md-button>
                <h3 class="md-title">Group details</h3>


            </md-toolbar>


            <md-table v-model="devices" md-card md-sort="status" md-sort-order="asc" md-fixed-header
                      @md-selected="onSelect" md-item
                      :md-selected-value-="devices"
                      :md-selected-value.sync="selectedDevices">
                <md-table-toolbar>
                    <div class="md-toolbar-section-start">

                        <md-field>
                            <span class="md-prefix">Name : </span>

                            <md-input v-model="group.name"></md-input>
                        </md-field>

                    </div>

                    <div class="md-toolbar-section-end">
                        <md-button @click="save" class="md-icon-button">
                            <md-icon>save</md-icon>
                        </md-button>
                    </div>
                </md-table-toolbar>


                <md-table-row slot="md-table-row" slot-scope="{ item }" md-selectable="multiple" md-auto-select>
                    <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                    <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                    <md-table-cell md-label="Brand" md-sort-by="phoneBrand">{{ item.phoneBrand }}</md-table-cell>
                    <md-table-cell md-label="Model" md-sort-by="phoneModel">{{ item.phoneModel }}</md-table-cell>
                </md-table-row>
            </md-table>

        </template>
        <template v-else>
            <p>LOADING...</p>
        </template>

    </div>

</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from "vue-class-component";
    import {Services} from "../../services/services.provider";
    import {Device, DevicesGroup} from "pandalab-commons";
    import {combineLatest} from "rxjs";

    @Component
    export default class GroupDetails extends Vue {
        protected group: DevicesGroup = null;
        private devices: Device[];
        private selectedDevices: Device[];


        mounted() {
            let observable = combineLatest(
                Services.getInstance().devicesService.listenGroup(this.$route.params.groupId),
                Services.getInstance().devicesService.listenDevices()
            );
            this.$subscribeTo(observable, result => {
                this.group = result[0];
                this.devices = result[1];
                if (!this.selectedDevices) {
                    this.selectedDevices = this.group.devices.map(id => this.devices.find(d => d._ref.id == id)).filter(value => value != null)
                }
            })
        }

        protected save() {

            this.group.devices = this.selectedDevices.map(value => value._ref.id);
            Services.getInstance().devicesService.saveGroup(this.group)
                .subscribe(value => {
                    console.log("group saved")
                }, error => {
                    console.error("can't save group", error)
                })


        }

        protected onSelect(items) {
            this.selectedDevices = items
        }

        protected onBack() {
            this.$router.back();
        }


    }

</script>
<style lang="css" scoped>

    #addbutton {
        position: absolute;
        top: 20px;
        right: 20px;
    }

</style>
