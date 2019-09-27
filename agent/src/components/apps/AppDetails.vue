<template>
    <div>
        <md-toolbar>
            <md-button class="md-icon-button" @click="onBack()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Application details</h3>
        </md-toolbar>
        <template v-if="app">
            <h1>{{app.name}}</h1>

            <div class="md-layout">
                <div class="md-layout-item">
                    <md-field>
                        <md-select v-model="flavor" name="flavor" id="flavor" placeholder="Flavor"
                                   v-on:md-selected="updateVersions">
                            <md-option v-for="f in flavors" v-bind:key="f" v-bind:value="f">{{f}}</md-option>
                        </md-select>
                    </md-field>
                    <md-table v-model="versions" md-card>
                        <md-table-toolbar>
                            <h1 class="md-title">{{flavor}} versions</h1>
                        </md-table-toolbar>

                        <md-table-row slot="md-table-row" slot-scope="{ item }">
                            <md-table-cell md-label="Version" md-sort-by="id" md-numeric>{{ item.versionName }}
                            </md-table-cell>
                            <md-table-cell md-label="VersionCode">{{ item.versionCode }}</md-table-cell>
                            <md-table-cell md-label="Date">{{ formatDate(item.timestamp.toDate()) }}</md-table-cell>

                            <md-table-cell md-label="Actions">
                                <md-button @click=createJob(item) class="md-icon-button">
                                    <md-icon>add</md-icon>
                                </md-button>

                                <md-button @click=openVersion(item) class="md-icon-button">
                                    <md-icon>chevron_right</md-icon>
                                </md-button>

                            </md-table-cell>
                        </md-table-row>
                    </md-table>

                </div>
                <div class="md-layout-item">
                    <md-card>
                        <LineChart :data="data" v-on:index="openReportAtIndex($event)"></LineChart>
                    </md-card>
                </div>


            </div>

        </template>
        <template v-else>
            <md-empty-state
                    md-rounded
                    md-icon="access_time"
                    md-label="Application is loading">
            </md-empty-state>
        </template>
        <dialog-create-job v-bind:display="false"/>
    </div>


</template>
<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, AppVersion, TestReport} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import LineChart from "./LineChart.vue";
    import {ChartData, ChartDataSets} from "chart.js"
    import {DIALOG_CREATE_JOB_DISPLAY_EVENT} from "../events";
    import DialogCreateJob from "../DialogCreateJob.vue";

    @Component({
        components: {LineChart, DialogCreateJob},

    })
    export default class AppDetails extends Vue {
        private app: AppModel = null;
        private allVersions: AppVersion[] = [];
        private versions: AppVersion[] = [];
        private flavors: string[] = [];
        private flavor: string = "";


        private data: Chart.ChartData = {labels: [], datasets: []};
        private reports: TestReport[];

        mounted() {

            let appId = this.$route.params.applicationId;
            this.$subscribeTo(Services.getInstance().appsService.listenApp(appId), app => {
                this.app = app;
            });

            this.$subscribeTo(Services.getInstance().appsService.listenAppVersions(appId), versions => {

                const flavorsSet = new Set<string>();
                versions.forEach(version => {
                    flavorsSet.add(version.flavor);
                });

                this.flavors = Array.from(flavorsSet.values());
                if (!flavorsSet.has(this.flavor) && this.flavors.length > 0) {
                    this.flavor = this.flavors[0];
                }

                this.allVersions = versions;
                this.updateVersions()
            });

            this.$subscribeTo(Services.getInstance().jobsService.listenAppReports(appId), reports => {

                //:colors="['#2E4EC0', '#EC870A', '#D12311']"
                const successData: ChartDataSets = {
                    data: [],
                    backgroundColor: '#5dc050',
                    borderColor: '#5dc050',
                    label: "Success"
                };
                const unstableData: ChartDataSets = {
                    data: [],
                    backgroundColor: '#EC870A',
                    borderColor: '#EC870A',
                    label: "Unstable"
                };
                const failureData: ChartDataSets = {
                    data: [],
                    backgroundColor: '#D12311',
                    borderColor: '#D12311',
                    label: "Error"
                };

                const chartData: ChartData = {labels: [], datasets: [successData, unstableData, failureData]};

                reports.forEach(report => {
                    let date = this.formatDate(report.date.toDate());
                    chartData.labels.push(date + "\n" + report.versionName);
                    successData.data.push(report.testSuccess);
                    unstableData.data.push(report.testUnstable);
                    failureData.data.push(report.testFailure);
                });

                this.data = chartData;
                this.reports = reports;


            })
        }



        protected formatDate(date) {
            const hours = date.getHours();
            let minutes = date.getMinutes();
            minutes = minutes < 10 ? '0' + minutes : minutes;
            const strTime = hours + ':' + minutes;
            let month = (date.getMonth() + 1)
            month = month < 10 ? '0' + month : month;
            return date.getDate() + "/" + month + "/" + date.getFullYear() + " " + strTime;
        }

        protected updateVersions() {
            this.versions = this.allVersions.filter(value => value.flavor === this.flavor)
        }


        protected onBack() {
            this.$router.back();
        }

        protected createJob(version: AppVersion){
            this.$emit(DIALOG_CREATE_JOB_DISPLAY_EVENT, {
                applicationId: this.$route.params.applicationId,
                versionId: version._ref.id,
            })
        }

        protected openReportAtIndex(index: number) {
            let testReport = this.reports[index];
            this.$router.push('/reports/' + testReport._ref.id)
        }

        protected openVersion(version: AppVersion){
            this.$router.push(`/applications/${this.$route.params.applicationId}/versions/` + version._ref.id);
        }
    }

</script>
<style lang="css" scoped>

</style>
