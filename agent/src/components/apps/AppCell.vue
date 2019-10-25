<template>
    <div @click="openAppDetails">

        <md-card id="card" class="md-primary" md-theme="error-card" md-with-hover>
            <md-icon v-if="jobStatus" class="badge md-elevation-5" :class="'job-'+jobStatus">{{icon}}</md-icon>
            <div id="header" class="md-layout">
                <div class="md-elevation-5" id="icon" :style="{background: stringToColour(app.name)}">
                    {{ app.name.substr(0,1).toUpperCase() }}
                </div>

                <div id="title">
                    <span class="md-title">{{  app.name.substr(1) }}</span>
                    <span class="md-subhead" v-if="appVersion">{{appVersion}} <BR/> {{appVersionDate}}</span>
                </div>


            </div>

            <TestReportLineChart id="chart" :legend="false" :reports="reports"></TestReportLineChart>

        </md-card>

    </div>


</template>
<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, JobStatus, TestReport} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from '../utils/Formatter';
    import TestReportLineChart from "./TestReportLineChart.vue";

    @Component({
        components: {TestReportLineChart},
    })
    export default class AppCell extends Vue {

        @Prop({required: true}) app: AppModel;


        formatter = new DateFormatter();

        appVersion: string = "";
        appVersionDate: string = "";
        jobStatus: string = "";
        private icon: string = "";
        protected reports: TestReport[] = [];


        mounted() {

            this.$subscribeTo(Services.getInstance().appsService.listenLastAppTest(this.app._ref.id), result => {

                this.appVersion = result.version.versionName;
                this.appVersionDate = this.formatter.formatDate(result.version.timestamp.toDate());

                this.jobStatus = result.jobReport.testFailure > 0 ? JobStatus.failure : result.jobReport.testUnstable > 0 ? JobStatus.unstable : JobStatus.success;

                switch (this.jobStatus) {
                    case JobStatus.unstable:
                        this.icon = 'brightness_medium';
                        break;
                    case JobStatus.failure:
                        this.icon = 'cloud';
                        break;
                    case JobStatus.success:
                        this.icon = 'brightness_high';
                        break;

                }
            })

            this.$subscribeTo(Services.getInstance().jobsService.listenAppReports(this.app._ref.id), reports => {
                this.reports = reports;
            })
        }

        protected stringToColour(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            let colour = '#';
            for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                colour += ('00' + value.toString(16)).substr(-2);
            }
            return colour;
        }

        openAppDetails() {
            console.log("open app page");
            this.$router.push('applications/' + this.app._ref.id)
        }


    }

</script>
<style lang="scss" scoped>
    @import "../../assets/css/theme.scss";

    #header {
        padding: 10px;
    }

    #icon {
        width: 100px;
        line-height: 100px;
        margin-top: -20px;
        text-align: center;
        font-size: 80px;
        color: white;
    }

    #title {
        text-overflow: ellipsis;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding-left: 2px;

        .md-subhead {
            padding-left: 8px;
        }
    }


    .badge {
        border-radius: 100%;
        position: absolute;
        top: -10px;
        right: -10px;
        width: 40px;
        height: 40px;
        color: white;
    }

    .job-unstable {
        background: $warn-color;
    }

    .job-failure {
        background: $error-color;
    }

    .job-success {
        background: $success-color;
    }

    #card {
        width: 400px;
        display: flex;
        flex-direction: column;
    }


    #chart {
        margin: 10px;
        height: 150px;
    }
</style>
