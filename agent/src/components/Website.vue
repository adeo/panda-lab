<template>
    <div>
        <h2 class="devices-home-title md-display-1">Devices:</h2>
        <md-switch class="devices-home-display-switch md-primary" v-model="listMode">Mode liste</md-switch>
        <div class="devices-card-container" v-if="!listMode">
            <div v-for="device in devices" class="devices-grid">
                <md-card md-with-hover class="devices-card">
                    <md-ripple>
                        <div @click="onDisplayDetail(device)">
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
        <div class="devices-list-container" v-if="listMode">
            <md-table md-card>
                <md-table-row>
                    <md-table-head>ID</md-table-head>
                    <md-table-head>Name</md-table-head>
                    <md-table-head>Brand</md-table-head>
                    <md-table-head>Model</md-table-head>
                    <md-table-head>Serial Id</md-table-head>
                </md-table-row>
                <md-table-row v-for="device in devices" v-bind:key="device.id" v-on:click="onDisplayDetail(device)">
                    <md-table-cell>{{ device.id }}</md-table-cell>
                    <md-table-cell>{{ device.name }}</md-table-cell>
                    <md-table-cell>{{ device.brand }}</md-table-cell>
                    <md-table-cell>{{ device.model }}</md-table-cell>
                    <md-table-cell>{{ device.serialId }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {from} from "rxjs";
    import * as firebase from "firebase";
    import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

    @Component
    export default class Website extends Vue {

        listMode: boolean = false;

        @Subscription()
        protected get devices() {
            return from(firebase.firestore().collection('devices').get())
                .map(value => {
                    return value.docs;
                })
                .flatMap(from)
                .map((value: QueryDocumentSnapshot) => {
                    const data = value.data();
                    return {
                        id: value.ref.id,
                        name: data.name,
                        brand: data.phoneBrand,
                        model: data.phoneModel,
                        serialId: data.serialId,
                        phoneModel: data.phoneModel,
                        pictureIcon: data.pictureIcon,
                    };
                })
                .toArray();
        }

        protected onDisplayDetail(device: any) {
            this.$router.push('/devices/' + device.id);
        }
    }
</script>

<style scoped>
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
        color:  white;
    }
</style>
