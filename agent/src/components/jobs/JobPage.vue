<template>
    <div id="job" class="md-layout">
        <div class="md-layout-item pl-container">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="$router.back()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Job
                </h2>
            </div>
            <div class="content">
                <ListTasks :tasks="tasks" :onTaskClick="onSelect"></ListTasks>
            </div>
        </div>

    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {Services} from "../../services/services.provider";
    import {Job, JobTask} from "pandalab-commons";
    import ListTasks from "../widget/ListTasks.vue";

    @Component({
        components: {ListTasks}
    })
    export default class JobJobsPage extends Vue {

        private jobService = Services.getInstance().jobsService;
        private job: Job = null;

        protected get jobId() {
            return this.$route.params.jobId;
        }


        tasks: JobTask[] = [];


        mounted() {
            this.$subscribeTo(this.jobService.listenJobTasks(this.jobId), tasks => {
                this.tasks = tasks;
            })
            this.$subscribeTo(this.jobService.listenJob(this.jobId), job => {
                this.job = job;
            })
        }

        onSelect(task: JobTask) {
            this.$router.push(`/reports/${task.job.id}`);
        }

    }

</script>
<style lang="css" scoped>
</style>
