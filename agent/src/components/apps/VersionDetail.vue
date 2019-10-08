<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="$router.back()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Version detail
                </h2>
            </div>

            <div class="md-layout-item" v-if="reports">
                <md-tabs md-alignment="centered">
                    <md-tab id="tab-pages-2" md-label="Reports">
                        <md-table v-model="reports" md-card>
                            <md-table-toolbar>
                                <h1 class="md-title">Reports</h1>
                            </md-table-toolbar>

                            <md-table-row slot="md-table-row" slot-scope="{ item }" @click="openTestReport(item)">
                                <md-table-cell md-label="Device Name">{{ item.versionName }}</md-table-cell>
                                <md-table-cell md-label="Tests">{{ item.totalTests }}</md-table-cell>
                                <md-table-cell md-label="Success">{{ item.testSuccess }}</md-table-cell>
                                <md-table-cell md-label="Unstable">{{ item.testUnstable }}</md-table-cell>
                                <md-table-cell md-label="Failure">{{ item.testFailure }}</md-table-cell>
                                <md-table-cell md-label="Date">{{ formatter.formatDate(item.date.toDate()) }}
                                </md-table-cell>
                            </md-table-row>
                        </md-table>
                    </md-tab>
                    <md-tab id="tab-pages-1" md-label="Metrics">
                        <div>
                            <TestReportLineChart :reports="reports"
                                                 v-on:index="openReportAtIndex($event)"></TestReportLineChart>
                        </div>
                    </md-tab>
                </md-tabs>
            </div>
            <template v-else>
                <md-empty-state
                        md-rounded
                        md-icon="access_time"
                        md-label="Reports is loading">
                </md-empty-state>
            </template>
            <dialog-create-job v-bind:display="false"/>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {TestReport} from "pandalab-commons";
    import TestReportLineChart from "./TestReportLineChart.vue";
    import {DateFormatter} from "../utils/Formatter";

    @Component({
        components: {TestReportLineChart}
    })
    export default class VersionDetail extends Vue {

        private reports: TestReport[] = [];
        protected formatter = new DateFormatter();

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

        protected openReportAtIndex(index: number) {
            this.openTestReport(this.reports[index])
        }

        protected openTestReport(report: TestReport) {
            this.$router.push("/reports/" + report._ref.id)
        }


    }
</script>

<style scoped>

</style>
