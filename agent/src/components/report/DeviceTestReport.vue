<template>
    <div class="container">
        <div class="md-layout" v-if="report">
            <div class="md-layout-item"> {{report.id}}</div>
            <div class="md-layout-item"> {{report.duration}}s</div>
            <div class="md-layout-item"> {{report.status}}
                <md-icon
                        :style="{'color': (report.status === 'PASS'?'#5dc050' : '#D12311')}">
                    fiber_manual_record
                </md-icon>
            </div>
        </div>
        <div class="md-layout">
            <div class="md-layout-item" v-for="image in images" :key="image"><img :src="image" alt=""/>
            </div>
        </div>
        <md-content class="md-scrollbar" v-if="logs">
            <div class="md-layout" v-for="(log, index) in logs" :key="index" :style="{color: getColor(log)}">
                <div class="md-layout-item md-size-15"> {{formatter.formatHour(log.date.toDate())}}</div>
                <div class="md-layout-item md-size-15"> {{log.level}}</div>
                <div class="md-layout-item md-size-30">[{{log.tag}}]</div>
                <div class="md-layout-item">{{log.message}}</div>
            </div>
        </md-content>
    </div>
</template>
<script lang="ts">

    import {Component, Mixins, Prop, Vue} from "vue-property-decorator";
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

            this.$subscribeTo(Services.getInstance().jobsService.getReportLogs(this.report), logs => {
                this.logs = logs.logs;
            });

            this.$subscribeTo(Services.getInstance().jobsService.getImagesUrl(this.report.screenshots), urls => {
                this.images = urls;
            })
        }


        protected getColor(log: TestLog): string {
            switch (log.level) {
                case 'INFO':
                    return "#5544ff";
                case 'DEBUG':
                    return "#29b62e";
                case 'WARN':
                    return "#EC870A";
                case 'ERROR':
                    return "#a40000";
            }
        }

    }

</script>
<style lang="css" scoped>
</style>
