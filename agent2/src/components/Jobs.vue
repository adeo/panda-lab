<template>
    <div id="jobs">
        <create-job />
        <md-button class="md-dense md-raised md-primary" v-on:click="displayDialog()">Ajouter un job
        </md-button>
        <md-table id="table" md-card>
            <md-table-toolbar>
                <h1 class="md-title">Liste des jobs</h1>
            </md-table-toolbar>
            <md-table-row>
                <md-table-head>ID</md-table-head>
                <md-table-head>Apk</md-table-head>
                <md-table-head>Test</md-table-head>
                <md-table-head>Release</md-table-head>
                <md-table-head>Completed</md-table-head>
                <md-table-head>Tasks</md-table-head>
            </md-table-row>
            <md-table-row v-for="job in jobs" v-bind:key="job.id" v-on:click="onSelect(job)" md-selectable="single"
                          class="md-primary">
                <md-table-cell>{{ job.id }}</md-table-cell>
                <md-table-cell>{{ job.apk }}</md-table-cell>
                <md-table-cell>{{ job.apkRelease }}</md-table-cell>
                <md-table-cell>{{ job.apkTest }}</md-table-cell>
                <md-table-cell>{{ job.completed }}</md-table-cell>
                <md-table-cell>{{ job.tasks.length }}</md-table-cell>
            </md-table-row>
        </md-table>
    </div>
</template>
<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import * as firebase from "firebase";
    import {from, of} from "rxjs";
    import {flatMap} from "rxjs/operators";
    import {Subscription,} from "vue-rx-decorators";
    import CreateJob from "@/components/CreateJob.vue";
    import {CREATE_JOB_EVENT_DISPLAY} from "@/components/events";

    @Component({
        components: {CreateJob}
    })
    export default class Jobs extends Vue {

        protected onSelect(job) {
            console.log(job);
        }


        @Emit(CREATE_JOB_EVENT_DISPLAY)
        private displayDialog() {
            console.log(`Click open dialog`);
        }

        @Subscription()
        protected get jobs() {
            return from(firebase.firestore().collection('jobs').get())
                .pipe(
                    flatMap((value) => {
                        return of(value.docs.map((snapshot) => {
                            const data = snapshot.data();
                            const result = {
                                id: snapshot.id,
                                apk: data.apk,
                                apkRelease: data.apk_release,
                                apkTest: data.apk_test,
                                completed: data.completed,
                                tasks: data.tasks,
                            };
                            console.log(result);
                            return result;
                        }));
                    })
                );
        }

    }

</script>
<style lang="css">
    .md-table-row:hover {
        background: silver;
        cursor: pointer;
    }
</style>
