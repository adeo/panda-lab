<template>
    <div class="pl-container">
        <div class="md-layout md-alignment-center">
            <h2 class="md-layout-item pl-title">Groups</h2>
            <md-button @click="createGroup" id="addbutton" class="md-fab md-primary">
                <md-icon>add</md-icon>
            </md-button>
        </div>
        <div>
            <template v-if="groups.length>0">
                <md-table v-model="groups" md-card md-sort="status" md-sort-order="asc" md-fixed-header>
                    <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="onDisplayDetail(item._ref.id)">
                        <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                        <md-table-cell md-label="DevicesPage" md-sort-by="phoneBrand">{{ item.devices.length }}
                        </md-table-cell>
                    </md-table-row>
                </md-table>
            </template>
            <template v-else-if="loaded">
                <md-empty-state
                        id="empty"
                        md-icon="group_work"
                        md-label="No group"
                        md-description="No devices group found">
                    <md-button class="md-primary md-raised" @click="createGroup">Create group</md-button>
                </md-empty-state>
            </template>


            <md-dialog-prompt
                    :md-active.sync="activeDialog"
                    v-model="groupName"
                    md-title="Group name"
                    md-input-maxlength="70"
                    md-input-placeholder="group name..."
                    v-on:md-confirm="confirmDialog"
                    md-confirm-text="Done"/>
        </div>
    </div>

</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from "vue-class-component";
    import {Services} from "../../services/services.provider";
    import {DevicesGroup} from "pandalab-commons";
    import * as winston from "winston";

    @Component
    export default class GroupsPage extends Vue {

        groupName: string = "";
        activeDialog: boolean = false;
        logger: winston.Logger = Services.getInstance().logger;

        loaded = false;

        groups: DevicesGroup[] = [];

        mounted() {
            this.$subscribeTo(Services.getInstance().devicesService.listenGroups(), groups => {
                this.loaded = true;
                this.groups = groups;
            })
        }


        onDisplayDetail(id: string) {
            this.$router.push('/groups/' + id);

        }

        createGroup() {
            this.activeDialog = true
        }

        confirmDialog(value) {
            this.groupName = "";
            if (value) {
                Services.getInstance().devicesService.createGroup(value)
                    .subscribe(group => {
                        this.onDisplayDetail(group._ref.id)
                    }, error => {
                        console.error("can't create group", error)
                    })
            }
        }
    }

</script>
<style lang="css" scoped>



</style>
