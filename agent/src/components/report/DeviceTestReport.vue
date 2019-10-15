<template>
    <div class="container">
<!--        <div class="md-layout" v-if="report">-->
<!--            <div class="md-layout-item"> {{report.id}}</div>-->
<!--            <div class="md-layout-item"> {{report.duration}}s</div>-->
<!--            <div class="md-layout-item"> {{report.status}}-->
<!--                <md-icon :style="{'color': (report.status === 'PASS'?'#5dc050' : '#D12311')}">fiber_manual_record-->
<!--                </md-icon>-->
<!--            </div>-->
<!--        </div>-->
        <md-card class="card-black">
            <md-card-content>
                <div id="logs-container">
                    <div class="logs-line md-layout"
                         v-for="(log, index) in logs"
                         v-bind:key="index">
                        <div class="md-layout" :class="'log-'+log.level.toString().toLowerCase()">
                            <span class="md-layout-item md-size-20">
                                {{ formatter.formatDate(log.date.toDate()) }} - {{ formatter.formatHour(log.date.toDate()) }}
                            </span>
                            <span class="md-layout-item md-size-10">{{ log.level }}</span>
                            <span class="md-layout-item md-size-20" style="overflow-wrap: break-word;">{{ log.tag }}</span>
                            <span class="md-layout-item">{{ log.message }}</span>
                        </div>
                    </div>
                </div>
            </md-card-content>
        </md-card>
    </div>
</template>
<script lang="ts">

    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import {TestLog, TestResult} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class DeviceTestReport extends Vue {

        @Prop({required: true}) report: TestResult;

        protected formatter = new DateFormatter();

        protected logs: TestLog[] = [];
        private images: string[] = [];

        mounted() {
            this.loadLogs();
        }

        @Watch('report', {immediate: true})
        updateView() {
            this.loadLogs();
        }

        loadLogs() {
            this.$subscribeTo(Services.getInstance().jobsService.getReportLogs(this.report), logs => {
                this.logs = logs.logs;
            });

            this.$subscribeTo(Services.getInstance().jobsService.getImagesUrl(this.report.screenshots), urls => {
                this.images = urls;
            });
        }

    }

</script>
<style scoped lang="scss">

    @import "../../assets/css/theme";

    .card-black {
        background-color: black !important;
    }

    .log-infos {
        min-width: 55px;
        text-align: center;
    }


    .log-error {
        color: $error-color;
    }

    .log-warn {
        color: $warn-color;
    }

    .log-verbose {
        color: $verbose-color;
    }

    .log-debug {
        color: $debug-color;
    }

    .log-info {
        color: $info-color;
    }

    .log-assert {
        color: $assert-color;
    }

    #logs-container {
        margin-bottom: -16px;
        margin-top: 16px;
        transition: max-height 0.26s ease;
        max-height: 1200px;
        overflow: scroll;
        display: block;
        padding: 24px 48px;
    }

</style>

