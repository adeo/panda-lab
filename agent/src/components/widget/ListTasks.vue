<template>
    <md-table id="task-table" v-if="tasks && tasks.length > 0" v-model="tasks" md-sort="status" md-sort-order="asc" md-card>
        <md-table-toolbar>
            <h1 class="md-title">Tasks</h1>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
            <md-table-cell md-label="ID" md-numeric>{{ item._ref.id }}</md-table-cell>
            <md-table-cell md-label="Date" md-sort-by="createdAt.seconds" >{{ formatter.formatDate(item.createdAt.toDate()) }}</md-table-cell>
            <md-table-cell md-label="Status" md-sort-by="status">{{ item.status }}</md-table-cell>
            <md-table-cell md-label="Job" md-sort-by="job">{{ item.job.id }}</md-table-cell>
        </md-table-row>
    </md-table>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Device, JobTask} from "pandalab-commons";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class ListTasks extends Vue {

        @Prop({
            required: true,
            default: [],
        })
        tasks: JobTask[];

        protected formatter = new DateFormatter();

    }

</script>

<style lang="scss" scoped>

    @import "../../assets/css/theme";

  
</style>
