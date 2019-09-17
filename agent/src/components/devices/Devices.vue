<template>
    <div>
        <h2 class="devices-home-title md-display-1">Devices:</h2>
        <template v-if="devices">
            <md-switch class="devices-home-display-switch md-primary" v-model="listMode" @change="onListMode()">Mode
                liste
            </md-switch>
            <div class="devices-card-container" v-if="!listMode">
                <div v-for="device in devices" v-bind:key="device.id" class="devices-grid">
                    <md-card md-with-hover class="devices-card">
                        <md-ripple>
                            <div @click="onDisplayDetail(device)">
                                <md-card-header>
                                    <div id="card-title" class="md-title">{{ device.phoneModel }}</div>
                                </md-card-header>

                                <md-card-media md-big>
                                    <img :src="device.pictureIcon ? device.pictureIcon : require('../../assets/images/device.png')"
                                         onerror="this.src = this.alt" :alt="require('../../assets/images/device.png')">
                                </md-card-media>

                                <md-card-content>
                                    <div id="card-footer" class="card-text-content">
                                        {{ device.name }}
                                    </div>
                                </md-card-content>
                            </div>
                        </md-ripple>
                    </md-card>
                </div>
            </div>
            <div class="devices-list-container" v-if="listMode">
                <md-table v-model="devices" md-card md-sort="status" md-sort-order="asc" md-fixed-header>
                    <!--                    <md-table-toolbar>-->
                    <!--                        <div class="md-toolbar-section-start">-->
                    <!--                            <h1 class="md-title">Devices</h1>-->
                    <!--                        </div>-->

                    <!--                        <md-field md-clearable class="md-toolbar-section-end">-->
                    <!--                            <md-input placeholder="Search by id..." v-model="search" @input="searchOnTable" />-->
                    <!--                        </md-field>-->
                    <!--                    </md-table-toolbar>-->
                    <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="onDisplayDetail(item)">
                        <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                        <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                        <md-table-cell md-label="Brand" md-sort-by="phoneBrand">{{ item.phoneBrand }}</md-table-cell>
                        <md-table-cell md-label="Model" md-sort-by="phoneModel">{{ item.phoneModel }}</md-table-cell>
                        <md-table-cell md-label="Status" md-sort-by="status">{{ item.status }}</md-table-cell>
                    </md-table-row>
                </md-table>
            </div>
        </template>
        <template v-else>
            <p>LOADING...</p>
        </template>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {Services} from "../../services/services.provider";

    @Component
    export default class Devices extends Vue {

        static LIST_MODE_KEY = 'listKey';

        listMode: boolean = this.getListModeStatus();

        @Subscription()
        protected get devices() {
            return Services.getInstance().devicesService.listenDevices();
        }

        protected onDisplayDetail(device: any) {
            this.$router.push('/devices/' + device._ref.id);
        }

        protected onListMode() {
            Services.getInstance().store.save(Devices.LIST_MODE_KEY, this.listMode ? "list" : "grid");
        }

        protected getListModeStatus() {
            let listMode = Services.getInstance().store.load(Devices.LIST_MODE_KEY, "list");
            return listMode == "list"
        }
    }
</script>

<style scoped>

    #card-title {
        min-height: 32px;
    }

    #card-footer {
        min-height: 22px;
    }

    .devices-card-container {
        margin: 15px;
        position: relative;
        overflow: auto;
    }

    .devices-list-container {
        margin: 15px;
        position: relative;
        overflow: auto;
    }

    .devices-card {
        width: 300px;
        float: left;
        margin: 15px;
    }

    .devices-home-title {
        margin: 15px;
        color: white;
    }

    .devices-home-display-switch {
        margin-left: 15px;
        color: white;
    }
</style>
