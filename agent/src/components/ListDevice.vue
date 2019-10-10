<template>
    <div>
        <template v-if="devices">
            <div class="devices-card-container" v-if="gridMode">
                <div v-for="device in devices" v-bind:key="device.id" class="devices-grid">
                    <md-card md-with-hover class="devices-card">
                        <md-ripple>
                            <div @click="onDisplayDetail(device)">
                                <md-card-header>
                                    <div id="card-title" class="md-title md-layout">
                                        <span class="md-layout-item">
                                            {{ device.phoneModel }}
                                        </span>
                                        <md-icon :class="'device-' + device.status">fiber_manual_record</md-icon>
                                        <md-button v-if="deleteMode" class="md-icon-button" @click="onDeleteDevice(device)">
                                            <md-icon>delete</md-icon>
                                        </md-button>
                                    </div>
                                </md-card-header>

                                <md-card-media md-big>
                                    <img :src="device.pictureIcon ? device.pictureIcon : require('../assets/images/device.png')"
                                         onerror="this.src = this.alt" :alt="require('../assets/images/device.png')">

                                </md-card-media>

                                <md-card-content>
                                    <div id="card-footer" class="card-text-content">
                                        {{ device.phoneBrand.toUpperCase() }}
                                    </div>
                                    <span class="identifier">{{ device._ref.id }}</span>
                                    {{ formatDate(device.lastConnexion) }}
                                </md-card-content>
                            </div>
                        </md-ripple>
                    </md-card>
                </div>
            </div>
            <div class="devices-list-container" v-else>
                <md-table v-model="devices" md-card md-sort="status" md-sort-order="asc" md-fixed-header>
                    <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="onDisplayDetail(item)">
                        <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                        <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                        <md-table-cell md-label="Brand" md-sort-by="phoneBrand">{{ item.phoneBrand }}</md-table-cell>
                        <md-table-cell md-label="Status" md-sort-by="status"><md-icon :class="'device-' + item.status">fiber_manual_record</md-icon></md-table-cell>
                        <md-table-cell v-if="deleteMode" md-label="actions">
                            <md-button class="md-icon-button" @click="onDeleteDevice(item)">
                                <md-icon>delete</md-icon>
                            </md-button>
                        </md-table-cell>
                    </md-table-row>
                </md-table>
            </div>
        </template>
        <template v-else>
            <p>No devices</p>
        </template>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Device} from "pandalab-commons";
    import {DateFormatter} from "./utils/Formatter";

    @Component
    export default class ListDevice extends Vue {

        @Prop({
            required: true,
            default: [],
        })
        devices: Device[];

        @Prop({
            default: false,
        })
        gridMode: boolean;

        @Prop({
            default: false,
        })
        deleteMode: boolean;

        @Prop()
        onClickDevice: (Device) => void;
        @Prop()
        onDeleteDevice: (Device) => void;

        protected formatter = new DateFormatter();

        protected onDisplayDetail(device: Device) {
            if (this.onClickDevice) {
                this.onClickDevice(device);
            }
        }

        protected formatDate(timestamp : number) {
            return this.formatter.formatDate(new Date(timestamp));
        }
    }

</script>

<style lang="scss" scoped>

    @import "../assets/css/theme.scss";

    .devices-card {
        width: 300px;
        float: left;
        margin: 15px;
    }

    .identifier {
        color: rgba(0, 0, 0, 0.54);
        color: var(--md-theme-default-text-accent-on-background, rgba(0, 0, 0, 0.54));
        font-size: 0.8em;
    }
</style>
