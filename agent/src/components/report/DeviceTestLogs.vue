<template>
    <div class="container card-black">
        <div id="logs-container">
            <div class="logs-line md-layout"
                 v-for="(log, index) in logs"
                 v-bind:key="index">
                <div class="line md-layout" :class="'log-'+log.level.toString().toLowerCase()">
                            <span class="date">
                                {{ formatter.formatDate(log.date.toDate(), true) }}
                            </span>
                    <span class="message md-layout-item">{{ log.level[0]+'/'+log.tag+": "+log.message }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">

    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import {TestLog, TestResult} from "pandalab-commons";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class DeviceTestLogs extends Vue {

        @Prop({required: true}) report: TestResult;

        protected formatter = new DateFormatter();

        protected logs: TestLog[] = [];

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


            // this.$subscribeTo(Services.getInstance().jobsService.getImagesUrl(this.report.screenshots), urls => {
            //     this.images = urls;
            // });
        }

    }

</script>
<style scoped lang="scss">

    @import "../../assets/css/theme";

    .date {
        width: 130px;
    }


    .message {
        overflow: auto;
    }

    .card-black {
        background-color: black !important;
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

    .line{
        padding-top: 4px;
    }
    #logs-container {
        font-size: 12px;
        transition: max-height 0.26s ease;
        //max-height: 1200px;
        //overflow: scroll;
        display: block;
        padding: 18px;
    }

</style>

