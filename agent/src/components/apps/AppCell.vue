<template>
    <div @click="openAppDetails">

        <md-card class="md-primary" md-theme="error-card" md-with-hover>


            <div id="title">
                <span class="md-title">{{  app.name.substr(1) }}</span>
                <span class="md-subhead" v-if="appVersion">{{appVersion}} <BR/> {{appVersionDate}}</span>
            </div>

            <md-icon v-if="jobStatus" class="badge md-elevation-5" :class="'job-'+jobStatus">{{icon}}</md-icon>


            <div class="md-elevation-5" id="icon" :style="{background: stringToColour(app.name)}">
                {{ app.name.substr(0,1).toUpperCase() }}
            </div>


        </md-card>

    </div>


</template>
<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, JobStatus} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from '../utils/Formatter';

    @Component
    export default class AppCell extends Vue {

        @Prop({required: true}) app: AppModel;


        formatter = new DateFormatter();

        appVersion: string = "";
        appVersionDate: string = "";
        jobStatus: string = "";
        private icon: string = "";


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

    #icon {
        width: 100px;
        line-height: 100px;
        position: absolute;
        top: -10px;
        left: 10px;
        text-align: center;
        font-size: 80px;
        color: white;
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

    .md-card {
        width: 280px;
        height: 100px;
        display: inline-block;
        vertical-align: top;
        margin-top: 20px;
    }

    #title {
        position: absolute;
        right: 8px;
        left: 110px;
        top: 16px;
        text-overflow: ellipsis;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding-left: 8px;
    }

</style>
