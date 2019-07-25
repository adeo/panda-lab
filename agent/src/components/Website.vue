<template>
    <div>
        <h2 class="devices-home-title md-display-1">Devices:</h2>
        <div class="devices-card-container">
            <div v-for="device in devices" class="devices-grid">
                <md-card md-with-hover class="devices-card">
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
                </md-card>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator';
    import {Subscription} from "vue-rx-decorators";
    import {firebaseService} from "@/services/firebase.service";

    @Component
    export default class Website extends Vue {

        @Subscription()
        protected get devices() {
            return firebaseService.listenDevicesFromFirestore();
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
