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
                <md-button @click="createJob" class="md-fab md-primary">
                    <md-icon>add</md-icon>
                </md-button>
                <md-button @click="downloadDialog.show = true" class="md-fab md-primary">
                    <md-icon>cloud_download</md-icon>
                </md-button>
            </div>

            <div class="md-layout-item" v-if="reports">
                <TestReportLineChart id="chart" :reports="reports"
                                     v-on:index="openReportAtIndex($event)"></TestReportLineChart>
                <md-table id="table" v-model="reports" md-card md-fixed-header>
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
            </div>
            <template v-else>
                <md-empty-state
                        md-rounded
                        md-icon="access_time"
                        md-label="Reports is loading">
                </md-empty-state>
            </template>
        </div>
        <md-dialog :md-active.sync="downloadDialog.show">
            <md-dialog-title>Download</md-dialog-title>
            <div v-if="downloadDialog.artifacts === undefined">
                <p>Loading</p>
            </div>
            <div v-else>
                <md-table v-model="downloadDialog.artifacts" md-card md-fixed-header>
                    <md-table-row slot="md-table-row" slot-scope="{ item }" @click=onDownloadArtifact(item)>
                        <md-table-cell md-label="Build type">{{ item.buildType }}</md-table-cell>
                        <md-table-cell md-label="Flavor">{{ item.flavor }}</md-table-cell>
                        <md-table-cell md-label="Type">{{ item.type }}</md-table-cell>
                        <md-table-cell md-label="Version code">{{ item.versionCode }}</md-table-cell>
                        <md-table-cell md-label="Version name">{{ item.versionName }}</md-table-cell>
                        <md-table-cell md-label="Date">{{ formatter.formatDate(item.timestamp.toDate()) }}</md-table-cell>
                    </md-table-row>
                </md-table>
            </div>
        </md-dialog>

        <md-snackbar md-position="center" :md-duration="4000" :md-active.sync="showClipboardSnackbar" md-persistent>
            <span>URL Copied !</span>
            <md-button class="md-primary" @click="showClipboardSnackbar = false">Retry</md-button>
        </md-snackbar>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {getRuntimeEnv, RuntimeEnv, Services} from "../../services/services.provider";
    import {TestReport} from "pandalab-commons";
    import TestReportLineChart from "./TestReportLineChart.vue";
    import {DateFormatter} from "../utils/Formatter";
    import {Artifact} from "pandalab-commons/dist/models/job.models";
    import {flatMap} from "rxjs/operators";

    @Component({
        components: {TestReportLineChart}
    })
    export default class VersionDetail extends Vue {

        private reports: TestReport[] = [];
        protected formatter = new DateFormatter();
        protected downloadDialog = {
            show: false,
            artifacts: undefined,
        };
        protected showClipboardSnackbar:boolean = false;

        mounted() {
            const applicationId = this.$route.params.applicationId;
            const versionId = this.$route.params.versionId;
            console.log(versionId);
            this.$subscribeTo(Services.getInstance().jobsService.listenVersionReports(applicationId, versionId), reports => {
                this.reports = reports;
            });

            this.$subscribeTo(Services.getInstance().appsService.getArtifacts(applicationId, versionId), artifacts => {
                this.downloadDialog.artifacts = artifacts;
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

        protected createJob() {
            this.$router.push(`/applications/${this.$route.params.applicationId}/versions/${this.$route.params.versionId}/createJob`);
        }

        protected isElectron: Boolean = getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER;

        protected onDownloadArtifact(artifact: Artifact) {
            this.downloadDialog.show = false;
            this.$subscribeTo(Services.getInstance().firebaseRepo.getFileUrl(artifact.path), url => {
                if (this.isElectron) {
                    const { clipboard } = require('electron');
                    clipboard.writeText(url);
                    this.showClipboardSnackbar = true;
                } else {
                    window.open(url);
                }
            });
        }

    }
</script>

<style scoped lang="scss">

    #chart {
        height: 270px;
        margin-bottom: 30px;
    }
</style>
