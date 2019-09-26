<template>
    <div>
        <md-toolbar>
            <md-button class="md-icon-button" @click="onBack()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Test details</h3>
        </md-toolbar>
        <template v-if="report">


            <div class="md-layout">
                <div class="md-layout-item">

                    <md-card>
                        <PieChart :data="data"></PieChart>
                    </md-card>
                </div>

                <div class="md-layout-item">

                    <md-table v-model="testReports" md-card>
                        <md-table-toolbar>
                            <h1 class="md-title">Tests</h1>
                        </md-table-toolbar>

                        <md-table-row slot="md-table-row" slot-scope="{ item }" @click="selectTest(item)">
                            <md-table-cell md-label="Status">
                                <md-icon
                                        :style="{'color': (item.status === 'success'?'#5dc050' : (item.status ==='unstable')? '#EC870A': '#D12311')}">
                                    fiber_manual_record
                                </md-icon>
                                {{ item.status }}
                            </md-table-cell>
                            <md-table-cell md-label="Id">{{ item.id }}</md-table-cell>
                            <md-table-cell md-label="Devices">{{ item.tests.length }}</md-table-cell>
                        </md-table-row>
                    </md-table>


                </div>

                <div class="md-layout-item">
                    <md-card>

                        <div v-if="selectedTestResult">

                            <md-field>
                                <md-select v-model="selectedReportDevice" name="selectedReportDevice"
                                           id="selectedReportDevice" placeholder="Device"
                                           v-on:md-selected="selectDevice">
                                    <md-option v-for="item in selectedReportDevices"
                                               :value="item._ref.id" :key="item._ref.id">
                                        {{item.name}}
                                    </md-option>
                                </md-select>
                            </md-field>


                            <md-card-content v-if="selectedTestResult">


                                <DeviceTestReport :report="selectedTestResult" :key="selectedTestResult.id"></DeviceTestReport>


                            </md-card-content>

                        </div>

                    </md-card>


                </div>
            </div>

        </template>
        <template v-else>
            <md-empty-state
                    md-rounded
                    md-icon="access_time"
                    md-label="Report is loading">
            </md-empty-state>
        </template>
    </div>


</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import {Device, TestReport, TestResult} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import PieChart from "./PieChart.vue";
    import {ChartData} from "chart.js";
    import {TestReportModel} from "../../services/jobs.service";
    import DeviceTestReport from "./DeviceTestReport.vue";
    import {from} from "rxjs";

    @Component({
        components: {PieChart, DeviceTestReport}
    })
    export default class Report extends Vue {
        protected report: TestReport = null;
        protected testReports: TestReportModel[] = [];
        protected data: ChartData = {labels: [], datasets: []};
        protected selectedReportModel: TestReportModel = null;
        protected selectedReportDevices: Device[] = [];
        protected selectedTestResult: TestResult = null;
        protected selectedReportDevice: string = null;

        mounted() {
            let reportId = this.$route.params.reportId;

            this.$subscribeTo(Services.getInstance().jobsService.getReport(reportId), result => {
                this.report = result;

                this.data = {
                    labels: ["Success", "Unstable", "Error"],
                    datasets: [{
                        data: [result.testSuccess, result.testUnstable, result.testFailure],
                        backgroundColor: ['#5dc050', '#EC870A', '#D12311']
                    }]
                }
            });

            this.$subscribeTo(Services.getInstance().jobsService.getTaskReports(reportId), result => {
                this.testReports = result;
            });
        }


        protected onBack() {
            this.$router.back();
        }

        protected selectDevice(deviceId: string) {
            let selectedReport = this.selectedReportModel.tests.find(value => {
                return value.device._ref.id == deviceId
            });
            if (!selectedReport) {
                return;
            }
            this.selectedTestResult = selectedReport.result
        }

        protected selectTest(selectedTest: TestReportModel) {

            this.selectedReportModel = selectedTest;
            this.selectedReportDevices = this.selectedReportModel.tests.map(v => v.device);

            //this.selectedTestResult = null;
            //this.selectedReportDevice = null;

            //setTimeout(() => {
            this.selectedTestResult = this.selectedReportModel.tests[0].result;
            this.selectedReportDevice = this.selectedReportModel.tests[0].device._ref.id;
            //}, 10)
        }

    }

</script>
<style lang="css" scoped>
</style>
