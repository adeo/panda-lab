<template>
    <div id="devices">
        <h1>Liste des devices</h1>
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
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {from} from "rxjs";
    import * as firebase from "firebase";
    import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

    @Component
    export default class Devices extends Vue {

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
                    };
                })
                .toArray();
        }

        protected onDisplayDetail(device: any) {
            this.$router.push('/devices/' + device.id);
        }
    }

</script>
<style>

</style>
