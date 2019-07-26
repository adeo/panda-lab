<template>
    <div>
        <device-details/>
        <h2 class="devices-home-title md-display-1">Devices:</h2>
        <div class="devices-card-container">
            <div v-for="device in devices" class="devices-grid">
                <md-card md-with-hover class="devices-card">
                    <md-ripple>
                        <div @click="showDetails(device)">
                            <md-card-header>
                                <div class="md-title">{{ device.phoneModel }}</div>
                            </md-card-header>

                            <md-card-media md-big>
                                <img :src="device.pictureIcon ? device.pictureIcon : require('../assets/images/device.png')">
                            </md-card-media>

                            <md-card-content>
                                <div class="card-text-content">
                                    {{ device.name }}
                                </div>
                            </md-card-content>
                        </div>
                    </md-ripple>
                </md-card>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
    import {Subscription} from "vue-rx-decorators";
    import {firebaseService} from "@/services/firebase.service";
    import {Device} from "@/models/device"
    import {DEVICE_DETAILS_EVENT_DISPLAY} from "@/components/events";
    import DeviceDetails from "@/components/DeviceDetails.vue";

    @Component({
        components: {DeviceDetails}
    })
    export default class Website extends Vue {

        @Subscription()
        protected get devices() {
            return firebaseService.listenDevicesFromFirestore();
        }

        @Emit(DEVICE_DETAILS_EVENT_DISPLAY)
        showDetails(device: Device) {
            console.log(`Click open dialog`);
            return device;
        }
    }
</script>

<style scoped>
    .devices-card-container {
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
</style>
