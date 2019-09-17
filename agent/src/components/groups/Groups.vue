<template>
    <div>
        <h2 class="devices-home-title md-display-1">Groups:</h2>
        <template v-if="groups">
            <div class="devices-list-container">
                <md-table v-model="groups" md-card md-sort="status" md-sort-order="asc" md-fixed-header>
                    <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="onDisplayDetail(item._ref.id)">
                        <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                        <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                        <md-table-cell md-label="Devices" md-sort-by="phoneBrand">{{ item.devices.length }}
                        </md-table-cell>
                    </md-table-row>
                </md-table>
            </div>

            <md-button @click="createGroup()" id="addbutton" class="md-fab md-primary">
                <md-icon>add</md-icon>
            </md-button>
        </template>
        <template v-else>
            <p>LOADING...</p>
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

</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from "vue-class-component";
    import {Subscription} from "vue-rx-decorators";
    import {Services} from "../../services/services.provider";
    import {DevicesGroup} from "pandalab-commons";

    @Component
    export default class Groups extends Vue {

        groupName: string = "";
        activeDialog: boolean = false;

        @Subscription(function () {
            return Services.getInstance().devicesService.listenGroups();
        })
        groups: DevicesGroup[] = [];

        onDisplayDetail(id: string){
            this.$router.push('/groups/' +id );

        }

        createGroup() {
            this.activeDialog = true
        }

        confirmDialog(value) {
            this.groupName = "";
            if(value){
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

    #addbutton {
        position: absolute;
        top: 20px;
        right: 20px;
    }

</style>
