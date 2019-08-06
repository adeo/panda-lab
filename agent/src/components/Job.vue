<template>
    <div id="job">
        <md-toolbar>
            <md-button class="md-icon-button" @click="$router.back()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'un job {{ job._id }}</h3>
        </md-toolbar>
        <div>Build type : {{ job.apk.buildType }}</div>
        <div>Flavor : {{ job.apk.flavor }}</div>
        <div>Package : {{ job.apk.package }}</div>
        <div>Path : {{ job.apk.path }}</div>
        <div>Type : {{ job.apk.type }}</div>
        <div>Version code : {{ job.apk.versionCode }}</div>
        <div>Version name : {{ job.apk.versionName }}</div>
        <div>Timestamp {{ job.apk.timestamp }}</div>
        <!--        <md-button class="md-dense md-raised md-primary" v-on:click="displayDialog()">Ajouter un job-->
        <!--        </md-button>-->
        <!--        <md-table id="table" md-card>-->
        <!--            <md-table-toolbar>-->
        <!--                <h1 class="md-title">Liste des jobs</h1>-->
        <!--            </md-table-toolbar>-->
        <!--            <md-table-row>-->
        <!--                <md-table-head>ID</md-table-head>-->
        <!--                <md-table-head>Apk</md-table-head>-->
        <!--                <md-table-head>Test</md-table-head>-->
        <!--                <md-table-head>Completed</md-table-head>-->
        <!--                <md-table-head>Tasks</md-table-head>-->
        <!--            </md-table-row>-->
        <!--            <md-table-row v-for="job in jobs" v-bind:key="job.id" v-on:click="onSelect(job)" md-selectable="single"-->
        <!--                          class="md-primary">-->
        <!--                <md-table-cell>{{ job._id }}</md-table-cell>-->
        <!--                <md-table-cell>{{ job.apk.path }}</md-table-cell>-->
        <!--                <md-table-cell>{{ job.apkTest.path }}</md-table-cell>-->
        <!--                <md-table-cell>{{ job.completed }}</md-table-cell>-->
        <!--                <md-table-cell>{{ job.tasks }}</md-table-cell>-->
        <!--            </md-table-row>-->
        <!--        </md-table>-->
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";

    @Component
    export default class Job extends Vue {

        private job: any;

        beforeCreate() {
            this.job = this.$route.params.job;
        }

    }

</script>
<style lang="css">
</style>
