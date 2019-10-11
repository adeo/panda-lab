<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <h2 class="pl-title">Jobs</h2>
            <md-table id="table" v-model="jobs" md-card md-sort="Date" md-sort-order="desc" md-fixed-header>
                <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="onSelect(item)">
                    <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
                    <md-table-cell md-label="Test" md-sort-by="apk_test.id">{{ item.apk_test.id }}</md-table-cell>
                    <md-table-cell md-label="Date" md-sort-by="createdAt.seconds">{{ formatter.formatDate(item.createdAt.toDate()) }}</md-table-cell>
                    <md-table-cell md-label="Completed" md-sort-by="completed">{{ item.completed }}</md-table-cell>
                    <md-table-cell md-label="Status" md-sort-by="status">{{item.status}}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>

</template>

<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import CreateJob from "./CreateJob.vue";
    import {Job} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component({
        components: {CreateJob}
    })
    export default class JobsPage extends Vue {

        protected formatter = new DateFormatter();
        jobs: Job[] = [];


        mounted() {
            this.$subscribeTo(Services.getInstance().jobsService.getAllJobs(), results => {
                this.jobs = results;
            })
        }

        protected onSelect(job: Job) {
            this.$router.push(`/jobs/${job._ref.id}`);
        }

    }

</script>
<style lang="css">
    .md-table-row:hover {
        background: silver;
        cursor: pointer;
    }
</style>
