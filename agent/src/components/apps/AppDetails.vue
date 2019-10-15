<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container" v-if="app">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="$router.back()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Application
                    <span class="pl-subtitle">{{app.name}}</span>
                </h2>
                <div>
                    <md-field>
                        <label>Flavor</label>
                        <md-select v-model="flavor" name="flavor" id="flavor" placeholder="Flavor"
                                   v-on:md-selected="updateVersions">
                            <md-option v-for="f in flavors" v-bind:key="f" v-bind:value="f">{{f}}</md-option>
                        </md-select>
                    </md-field>
                </div>
            </div>

            <div class="md-layout-item" v-if="app">
                <div class="md-layout md-alignment-center-left">
                    <div>

                    </div>
                </div>

                <md-tabs md-alignment="centered">
                    <md-tab id="tab-pages-2" md-label="Versions">
                        <md-table v-model="versions" md-card>
                            <md-table-row slot="md-table-row" slot-scope="{ item }">
                                <md-table-cell md-label="Version" md-sort-by="id" md-numeric>{{ item.versionName }}
                                </md-table-cell>
                                <md-table-cell md-label="VersionCode">{{ item.versionCode }}</md-table-cell>
                                <md-table-cell md-label="Date">{{ formatter.formatDate(item.timestamp.toDate()) }}</md-table-cell>

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
                    </md-tab>
                    <md-tab id="tab-pages-1" md-label="Metrics">
                        <div>
                            <TestReportLineChart :reports="reports" v-on:index="openReportAtIndex($event)"></TestReportLineChart>
                        </div>
                    </md-tab>
                </md-tabs>
            </div>
            <template v-else>
                <md-empty-state
                        md-rounded
                        md-icon="access_time"
                        md-label="Application is loading">
                </md-empty-state>
            </template>
        </div>
    </div>

</template>
<script lang="ts">

    import {Component, Emit, Mixins, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, AppVersion, TestReport} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import TestReportLineChart from "./TestReportLineChart.vue";
    import {ChartData, ChartDataSets} from "chart.js"
    import {DIALOG_CREATE_JOB_DISPLAY_EVENT} from "../../models/events";
    import DialogCreateJob from "../jobs/DialogCreateJob.vue";
    import {DateFormatter} from "../utils/Formatter";

    @Component({
        components: {TestReportLineChart},
    })
    export default class AppDetails extends Vue {
        private app: AppModel = null;
        private allVersions: AppVersion[] = [];
        private versions: AppVersion[] = [];
        private flavors: string[] = [];
        private flavor: string = "";

        protected formatter = new DateFormatter();

        private reports: TestReport[] = [];

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
                this.reports = reports;
            })
        }

        protected updateVersions() {
            this.versions = this.allVersions.filter(value => value.flavor === this.flavor)
        }

        protected onBack() {
            this.$router.back();
        }

        protected createJob(version: AppVersion){
            this.$router.push(`/applications/${this.$route.params.applicationId}/versions/${version._ref.id}/createJob`);
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
    .md-tabs {
        margin-top: 50px;
    }
</style>
