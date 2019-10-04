<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <h2 class="pl-title">Jobs</h2>
            <md-table id="table" md-card>
                <md-table-row>
                    <md-table-head>ID</md-table-head>
                    <md-table-head>Apk</md-table-head>
                    <md-table-head>Test</md-table-head>
                    <md-table-head>Completed</md-table-head>
                    <md-table-head>Tasks</md-table-head>
                </md-table-row>
                <md-table-row v-for="job in jobs" v-bind:key="job.id" v-on:click="onSelect(job)" md-selectable="single"
                              class="md-primary">
                    <md-table-cell>{{ job._ref.id }}</md-table-cell>
                    <md-table-cell>{{ job.apk.id }}</md-table-cell>
                    <md-table-cell>{{ job.apk_test.id }}</md-table-cell>
                    <md-table-cell>{{ job.completed }}</md-table-cell>
                    <md-table-cell>{{ job.status }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>

</template>

<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import {Observable} from "rxjs";
    import {Subscription,} from "vue-rx-decorators";
    import CreateJob from "@/components/CreateJob.vue";
    import {CREATE_JOB_EVENT_DISPLAY} from "../models/events";
    import {Job} from "pandalab-commons";
    import {Services} from "../services/services.provider";

    @Component({
        components: {CreateJob}
    })
    export default class Jobs extends Vue {

        private jobService = Services.getInstance().jobsService;

        protected onSelect(job: Job) {
            this.$router.push('/jobs/' + job._ref.id);
        }

        @Emit(CREATE_JOB_EVENT_DISPLAY)
        private displayDialog() {
            console.log(`Click open dialog`);
        }

        @Subscription()
        protected get jobs(): Observable<Job[]> {
            return this.jobService.getAllJobs();
        }

    }

</script>
<style lang="css">
    .md-table-row:hover {
        background: silver;
        cursor: pointer;
    }
</style>
