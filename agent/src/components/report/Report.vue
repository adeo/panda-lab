<template xmlns:v-init="http://www.w3.org/1999/xhtml">
    <div class="md-layout">
        <div class="md-layout-item pl-container" v-if="report">
            <h2 class="pl-title">Report</h2>
            <div class="md-layout-item md-layout md-gutter">
                <div class="md-layout-item">
                    <md-table v-model="testReports" md-card @md-selected="selectTest">
                        <md-table-toolbar>
                            <h1 class="md-title">Tests</h1>
                        </md-table-toolbar>
                        <md-table-row slot="md-table-row" slot-scope="{ item }" md-selectable="single">
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
                <div class="md-layout-item md-size-25">
                    <PieChart :data="data"></PieChart>
                </div>
            </div>

            <md-tabs md-alignment="centered" v-if="selectedTestResult">
                <md-tab id="tab-pages-2" md-label="Logs">
                    <div class="md-layout-item">

                    </div>
                    <template v-if="selectedTestResult">
                        <h2>Choice the phone</h2>
                        <div class="md-layout">
                            <div class="md-layout-item-40">
                                <md-select v-model="selectedReportDevice" name="selectedReportDevice"
                                           id="selectedReportDevice" placeholder="Device"
                                           v-on:md-selected="selectDevice">
                                    <md-option v-for="item in selectedReportDevices" :value="item._ref.id"
                                               :key="item._ref.id">
                                    <span v-init:report="reportByDevice.get(item._ref.id)">
                                        {{item.name}}
                                    </span>
                                    </md-option>
                                </md-select>
                            </div>
                            <div class="md-layout-item">
                                <md-icon v-if="selectedTestResult"
                                         :style="{'color': (selectedTestResult.status === 'PASS' ? '#5dc050' : '#D12311')}">
                                    fiber_manual_record
                                </md-icon>
                            </div>
                        </div>
                        <md-field>
                        </md-field>
                        <div class="md-layout-item" v-if="selectedTestResult">
                            <DeviceTestReport :report="selectedTestResult"
                                              :key="selectedTestResult.id"></DeviceTestReport>
                        </div>
                    </template>
                </md-tab>
                <md-tab id="tab-pages-1" md-label="Images">
                    <div class="md-layout md-gutter">
                        <div class="md-layout-item md-size-20" v-for="image in images" :key="image">
                            <img :src="image"/>
                        </div>
                    </div>
                </md-tab>
            </md-tabs>
        </div>
        <div class="md-layout md-gutter md-alignment-center-center" v-else>
            <md-empty-state
                    md-rounded
                    md-icon="access_time"
                    md-label="Report is loading">
            </md-empty-state>
        </div>
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

    @Component({
        components: {PieChart, DeviceTestReport}
    })
    export default class Report extends Vue {
        protected report: TestReport = null;
        protected testReports: TestReportModel[] = [];
        protected data: ChartData = {labels: [], datasets: []};
        protected selectedReportModel: TestReportModel = null;
        protected reportByDevice: Map<string, TestResult> = new Map();
        protected selectedReportDevices: Device[] = [];
        protected selectedTestResult: TestResult = null;
        protected selectedReportDevice: string = null;
        private images: string[] = [];

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
                };
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
            this.selectedTestResult = selectedReport.result;
        }

        protected selectTest(selectedTest: TestReportModel) {
            this.reportByDevice.clear();
            for (let test of selectedTest.tests) {
                this.reportByDevice.set(test.device._ref.id, test.result);
            }
            console.log(this.reportByDevice);
            this.selectedReportModel = selectedTest;
            this.selectedReportDevices = this.selectedReportModel.tests.map(v => v.device);

            this.selectedTestResult = this.selectedReportModel.tests[0].result;
            this.selectedReportDevice = this.selectedReportModel.tests[0].device._ref.id;

            this.$subscribeTo(Services.getInstance().jobsService.getImagesUrl(this.selectedTestResult.screenshots), urls => {
                this.images = urls;
            });
        }

    }

</script>
<style lang="scss" scoped>

    .md-tabs {
        margin-top: 30px;
    }
</style>
