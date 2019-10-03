<template>
    <div id="list-devices">
        <template v-if="devices">
            <div class="devices-card-container" v-if="gridMode">
                <div v-for="device in devices" v-bind:key="device.id" class="devices-grid">
                    <md-card md-with-hover class="devices-card">
                        <md-ripple>
                            <div @click="onDisplayDetail(device)">
                                <md-card-header>
                                    <div id="card-title" class="md-title">{{ device.phoneModel }}</div>
                                </md-card-header>

                                <md-card-media md-big>
                                    <img :src="device.pictureIcon ? device.pictureIcon : require('../assets/images/device.png')"
                                         onerror="this.src = this.alt" :alt="require('../assets/images/device.png')">
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
            <div class="devices-list-container" v-else>
                <md-table v-model="devices" md-card md-sort="status" md-sort-order="asc" md-fixed-header>
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
            <p>No devices</p>
        </template>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Device} from "pandalab-commons";

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

        @Prop()
        onClickDevice: (Device) => void;

        // @Watch('devices')
        // onPropertyChanged(value: any, oldValue: any) {
        //     console.log(value);
        // }

        protected onDisplayDetail(device: Device) {
            if (this.onClickDevice) {
                this.onClickDevice(device);
            }
            // this.$router.push('/devices/' + device._ref.id);
        }

    }

</script>

<style lang="css" scoped>

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

</style>
