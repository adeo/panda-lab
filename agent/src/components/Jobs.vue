<template>
    <div id="jobs">
        <create-job/>
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
                <md-table-cell>{{ job.apk._path }}</md-table-cell>
                <md-table-cell>{{ job.apkTest._path }}</md-table-cell>
                <md-table-cell>{{ job.completed }}</md-table-cell>
                <md-table-cell>{{ job.tasks }}</md-table-cell>
            </md-table-row>
        </md-table>
    </div>
</template>
<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import {Observable} from "rxjs";
    import {Subscription,} from "vue-rx-decorators";
    import CreateJob from "@/components/CreateJob.vue";
    import {CREATE_JOB_EVENT_DISPLAY} from "@/components/events";
    import {jobService} from "@/services/job.service";
    import {Job} from "pandalab-commons";


    @Component({
        components: {CreateJob}
    })
    export default class Jobs extends Vue {

        protected onSelect(job: Job) {
            this.$router.push('/jobs/' + job._id);
        }

        @Emit(CREATE_JOB_EVENT_DISPLAY)
        private displayDialog() {
            console.log(`Click open dialog`);
        }

        @Subscription()
        protected get jobs(): Observable<Job[]> {
            return jobService.getAllJobs();
        }

    }

</script>
<style lang="css">
    .md-table-row:hover {
        background: silver;
        cursor: pointer;
    }
</style>
