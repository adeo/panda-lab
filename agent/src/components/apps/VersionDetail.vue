<template>
    <div id="version-detail">
        <md-toolbar>
            <md-button class="md-icon-button" @click="onBack()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Version detail</h3>
        </md-toolbar>
        <div v-if="reports">
            <md-table v-model="reports" md-card>
                <md-table-toolbar>
                    <h1 class="md-title">Reports</h1>
                </md-table-toolbar>

                <md-table-row slot="md-table-row" slot-scope="{ item }">
                    <md-table-cell md-label="Version Name">{{ item.versionName }}</md-table-cell>
                    <md-table-cell md-label="Tests">{{ item.totalTests }}</md-table-cell>
                    <md-table-cell md-label="Success">{{ item.testSuccess }}</md-table-cell>
                    <md-table-cell md-label="Unstable">{{ item.testUnstable }}</md-table-cell>
                    <md-table-cell md-label="Failure">{{ item.testFailure }}</md-table-cell>
                    <md-table-cell md-label="Date">{{ formatDate(item.date.toDate()) }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {TestReport} from "pandalab-commons";

    @Component
    export default class VersionDetail extends Vue {

        private reports: TestReport[] = [];

        mounted() {
            const applicationId = this.$route.params.applicationId;
            const versionId = this.$route.params.versionId;
            console.log(versionId);
            this.$subscribeTo(Services.getInstance().jobsService.listenVersionReports(applicationId, versionId), reports => {
                this.reports = reports;

            });
        }

        onBack() {
            this.$router.back();
        }

        protected formatDate(date) {
            const hours = date.getHours();
            let minutes = date.getMinutes();
            minutes = minutes < 10 ? '0' + minutes : minutes;
            const strTime = hours + ':' + minutes;
            let month = (date.getMonth() + 1);
            month = month < 10 ? '0' + month : month;
            return date.getDate() + "/" + month + "/" + date.getFullYear() + " " + strTime;
        }


    }
</script>

<style scoped>

</style>
