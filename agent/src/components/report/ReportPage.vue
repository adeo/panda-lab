<template xmlns:v-init="http://www.w3.org/1999/xhtml">
    <div class="pl-container">
        <div class="md-layout md-alignment-center-center">
            <div class="md-layout-item-5">
                <md-button class="md-icon-button" @click="$router.back()">
                    <md-icon>arrow_back</md-icon>
                </md-button>
            </div>
            <h2 class="md-layout-item pl-title">
                Report
            </h2>
        </div>
        <div v-if="report">
            <div class="md-layout-item md-layout md-gutter">
                <div class="md-layout-item md-small-size-100 md-size-66">
                    <md-table v-model="testReports" md-card md-fixed-header @md-selected="selectTest">
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
                            <md-table-cell md-label="DevicesPage">{{ item.tests.length }}</md-table-cell>
                        </md-table-row>
                    </md-table>
                </div>
                <div class="md-layout-item md-small-hide md-size-33">
                    <PieChart :data="data"></PieChart>
                </div>
            </div>
            <md-tabs md-alignment="centered" v-if="selectedTestResult">
                <md-tab id="tab-pages-2" md-label="Logs">
                    <div id="devices-select" class="md-layout md-alignment-center-center">
                        <div>
                            <md-field>
                                <label>Choice the phone</label>
                                <md-select v-model="selectedReportDevice" name="selectedReportDevice"
                                           id="selectedReportDevice" placeholder="Device"
                                           v-on:md-selected="selectDevice">
                                    <md-option v-for="item in selectedReportDevices" :value="item._ref.id"
                                               :key="item._ref.id"
                                               :style="{'color': (reportByDevice.get(item._ref.id).status === 'PASS' ? '#5dc050' : '#D12311')}">

                                        {{item.name + " - "+ reportByDevice.get(item._ref.id).status}}
                                        <!--                                        <span :style="{'color': (reportByDevice.get(item._ref.id).status === 'PASS' ? '#5dc050' : '#D12311')}"></span>-->
                                    </md-option>
                                </md-select>
                            </md-field>
                        </div>
                        &nbsp;
                        <div class="md-layout-item">
                            <md-icon v-if="selectedTestResult"
                                     :style="{'color': (selectedTestResult.status === 'PASS' ? '#5dc050' : '#D12311')}">
                                fiber_manual_record
                            </md-icon>
                        </div>
                    </div>
                    <div class="md-layout-item" v-if="selectedTestResult">
                        <DeviceTestLogs :report="selectedTestResult"
                                        :key="selectedTestResult.id"></DeviceTestLogs>
                    </div>
                </md-tab>
                <md-tab id="tab-pages-1" md-label="Images">
                    <div class="images-container">
                        <DeviceTestImages v-for="(imageData, index) in images" :key="index" :name="imageData.device"
                                          :images="imageData.screenshots"></DeviceTestImages>
                    </div>
                </md-tab>
            </md-tabs>
        </div>
        <div id="empty" class="md-layout md-gutter md-alignment-center-center" v-else>
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
    import DeviceTestLogs from "./DeviceTestLogs.vue";
    import DeviceTestImages from "./DeviceTestImages.vue";

    @Component({
        components: {PieChart, DeviceTestLogs, DeviceTestImages}
    })
    export default class ReportPage extends Vue {
        protected report: TestReport = null;
        protected testReports: TestReportModel[] = [];
        protected data: ChartData = {labels: [], datasets: []};
        protected selectedReportModel: TestReportModel = null;
        protected reportByDevice: Map<string, TestResult> = new Map();
        protected selectedReportDevices: Device[] = [];
        protected selectedTestResult: TestResult = null;
        protected selectedReportDevice: string = null;
        protected images: { screenshots: string[], device: string }[] = [];

        mounted() {
            let reportId = this.$route.params.reportId;

            this.$subscribeTo(Services.getInstance().jobsService.getReport(reportId), result => {
                if (!result) {
                    return
                }
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
                if (result.length > 0) {
                    this.selectTest(result[0])
                }
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
            this.selectedReportModel = selectedTest;
            this.selectedReportDevices = this.selectedReportModel.tests.map(v => v.device);
            this.selectedTestResult = this.selectedReportModel.tests[0].result;
            this.selectedReportDevice = this.selectedReportModel.tests[0].device._ref.id;

            this.images = this.selectedReportModel.tests.map(test => {
                return {
                    screenshots: test.result.screenshots,
                    device: test.device.name
                };
            });
        }

    }

</script>
<style lang="scss" scoped>

    #empty {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
    }

    .md-tabs {
        background: #e2e2e2;
    }

    .md-tab {
        padding: 0px;
        overflow: visible;
    }

    #devices-select {
        margin: 0 3% -20px 3%;
    }


    .images-container {
        overflow-x: scroll;
    }

</style>
