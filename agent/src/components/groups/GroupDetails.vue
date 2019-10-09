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
                        Group details
                    </h2>
                    <div>
                        <md-button class="md-raised md-accent" @click="showDialog = true">
                            Delete
                        </md-button>
                    </div>

                </div>
                <div v-if="group" class="md-layout-item md-gutter">
                    <div class="md-layout-item md-layout md-alignment-center-left">
                        <div>
                            <md-field>
                                <span class="md-prefix">Name : </span>
                                <md-input v-model="group.name"></md-input>
                            </md-field>
                        </div>
                        <div>
                            <md-button @click="save" class="md-icon-button">
                                <md-icon>save</md-icon>
                            </md-button>
                        </div>
                    </div>
                    <div class="md-layout-item">
                        <md-table v-if="group" v-model="devices" md-card md-sort="status" md-sort-order="asc"
                                  md-fixed-header
                                  @md-selected="onSelect" md-item
                                  :md-selected-value-="devices"
                                  :md-selected-value.sync="selectedDevices">
                            <md-table-row slot="md-table-row" slot-scope="{ item }" md-selectable="multiple"
                                          md-auto-select>
                                <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                                <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                                <md-table-cell md-label="Brand" md-sort-by="phoneBrand">{{ item.phoneBrand }}
                                </md-table-cell>
                                <md-table-cell md-label="Model" md-sort-by="phoneModel">{{ item.phoneModel }}
                                </md-table-cell>
                            </md-table-row>
                        </md-table>
                    </div>
                </div>
                <div class="md-layout md-gutter md-alignment-center-center" v-else>
                    <md-empty-state
                            md-rounded
                            md-icon="access_time"
                            md-label="Group is loading">
                    </md-empty-state>
                </div>
            </div>
            <md-snackbar :md-position="snackbar.position" :md-duration="snackbar.duration"
                         :md-active.sync="snackbar.display" md-persistent>
                <span>{{ snackbar.message }}</span>
                <md-button class="md-primary" @click="snackbar.display = false">Fermer</md-button>
            </md-snackbar>
        </div>
        <md-dialog-confirm
                :md-active.sync="showDialog"
                md-title="Delete this group ?"
                md-confirm-text="Agree"
                md-cancel-text="Disagree"
                @md-cancel="showDialog = false"
                @md-confirm="onDeleteConfirm()" />
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from "vue-class-component";
    import {Services} from "../../services/services.provider";
    import {Device, DevicesGroup} from "pandalab-commons";
    import * as winston from "winston";

    @Component
    export default class GroupDetails extends Vue {
        protected group: DevicesGroup = null;
        private devices: Device[];
        private selectedDevices: Device[] = [];
        private edited: boolean = false;
        private logger: winston.Logger;
        private snackbar = {
            display: false,
            message: '',
            duration: 4000,
            position: 'center',
        };

        showDialog = false;

        constructor() {
            super();
            this.logger = Services.getInstance().logger;
        }

        mounted() {
            const observable = Services.getInstance().devicesService.listenerGroupAndDevices(this.$route.params.groupId);
            this.$subscribeTo(observable, result => {
                this.group = result[0];
                this.devices = result[1];
                console.log(this.devices);
                if (!this.edited) {
                    this.selectedDevices = this.group.devices.map(id => this.devices.find(d => d._ref.id == id)).filter(value => value != null)
                }
            }, err => {
                this.logger.error(err);
            })
        }

        onDeleteConfirm() {
            this.showDialog = false;
            this.group._ref.delete().then(() => {
                this.logger.verbose(`Group ${this.group._ref.id} is deleted`);
            }, error => {
                this.logger.error(error);
            });
        }

        protected save() {

            this.group.devices = this.selectedDevices.map(value => value._ref.id);
            Services.getInstance().devicesService.saveGroup(this.group)
                .subscribe(() => {
                    this.snackbar.message = `The group is saved`;
                    this.snackbar.display = true;
                    this.$router.back();
                }, error => {
                    console.error(error);
                    this.snackbar.message = `Can't save the group`;
                    this.snackbar.display = true;
                });


        }

        protected onSelect(items) {
            this.selectedDevices = items;
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
