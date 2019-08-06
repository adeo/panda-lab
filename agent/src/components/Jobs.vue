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
                <md-table-head>Completed</md-table-head>
                <md-table-head>Tasks</md-table-head>
            </md-table-row>
            <md-table-row v-for="job in jobs" v-bind:key="job.id" v-on:click="onSelect(job)" md-selectable="single"
                          class="md-primary">
                <md-table-cell>{{ job._id }}</md-table-cell>
                <md-table-cell>{{ job.apk.path }}</md-table-cell>
                <md-table-cell>{{ job.apkTest.path }}</md-table-cell>
                <md-table-cell>{{ job.completed }}</md-table-cell>
                <md-table-cell>{{ job.tasks }}</md-table-cell>
            </md-table-row>
        </md-table>
    </div>
</template>
<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import * as firebase from "firebase";
    import {from} from "rxjs";
    import {Subscription,} from "vue-rx-decorators";
    import CreateJob from "@/components/CreateJob.vue";
    import {CREATE_JOB_EVENT_DISPLAY} from "@/components/events";
    import DocumentReference = firebase.firestore.DocumentReference;

    @Component({
        components: {CreateJob}
    })
    export default class Jobs extends Vue {

        protected onSelect(job) {
            this.$router.push({
                name: 'jobDetail',
                params: {
                    job
                }
            });
            // this.$router.push('/jobs/' + job._id);
        }


        @Emit(CREATE_JOB_EVENT_DISPLAY)
        private displayDialog() {
            console.log(`Click open dialog`);
        }

        @Subscription()
        protected get jobs() {
            return from(firebase.firestore().collection('jobs').get())
                .map(value => value.docs)
                .flatMap(from)
                .map(async doc => {
                    const data = doc.data();
                    const jobsTasks = await firebase.firestore().collection('jobs-tasks').where('job', '==', doc.ref).get();
                    return {
                        _path: doc.ref.path,
                        _id: doc.id,
                        apk: (await (data.apk as DocumentReference).get()).data(),
                        apkTest: (await (data.apk_test as DocumentReference).get()).data(),
                        completed: data.completed,
                        tasks: jobsTasks.docs.length,
                    };
                })
                .flatMap(promise => from(promise))
                .toArray()
                .map(v => {
                    console.log(v);
                    return v;
                });
        }

    }

</script>
<style lang="css">
    .md-table-row:hover {
        background: silver;
        cursor: pointer;
    }
</style>
