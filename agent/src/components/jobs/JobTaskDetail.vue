<template>
    <div id="job">
        <md-toolbar>
            <md-button class="md-icon-button" @click="$router.back()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'une JobTask</h3>
        </md-toolbar>
        <div v-if="jobTask">

            <md-list class="md-double-line">
                <md-subheader>Tache</md-subheader>

                <md-list-item>
                    <div class="md-list-item-text">
                        <span>{{ jobTask.result.title }}</span>
                        <span>{{ jobTask.result.duration }} secondes</span>
                        <span>Started at : {{ jobTask.result.started.seconds }}</span>
                    </div>
                </md-list-item>

                <md-divider></md-divider>

                <md-subheader>Résultats</md-subheader>

                <md-list-item v-for="result in jobTask.result.results" v-bind:key="result.id">

                    <div class="md-list-item-text">
                        <span>Id : {{ result.id }}</span>
                        <span>Install Failed : {{ result.installFailed }}</span>
                        <span>Started : {{ result.started.seconds }}</span>

                        <md-subheader>Tests</md-subheader>

                        <md-list class="md-double-line">
                            <md-list-item v-for="test in result.tests" v-bind:key="test.className + test.methodName">
                                <div class="md-list-item-text">
                                    <span>Class : {{ test.className }}</span>
                                    <span>Méthode : {{ test.methodName }}</span>
                                    <span>Statut : {{ test.status }}</span>
                                </div>
                                <md-list class="md-double-line">
                                    <md-list-item v-for="log in test.logs"
                                                  v-bind:key="log.message+log.pid+log.tag+log.tid">
                                        <div class="md-list-item-text">
                                            <span>AppName : {{ log.appName }}</span>
                                            <span>Level : {{ log.level }}</span>
                                            <span>Message : {{ log.message }}</span>
                                            <span>pid : {{ log.pid }}</span>
                                            <span>tag : {{ log.tag }}</span>
                                            <span>tid : {{ log.tid }}</span>
                                        </div>
                                    </md-list-item>
                                </md-list>
                            </md-list-item>
                        </md-list>
                    </div>

                </md-list-item>
            </md-list>
        </div>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {Subscription} from "vue-rx-decorators";
    import {Services} from "../../services/services.provider";

    @Component
    export default class JobTaskDetail extends Vue {

        private jobService = Services.getInstance().jobsService;

        protected get jobId() {
            return this.$route.params.jobId;
        }

        protected get taskId() {
            return this.$route.params.taskId;
        }

        @Subscription()
        protected get jobTask() {
            return this.jobService.getJobTask(this.taskId);
        }

    }

</script>
<style lang="css" scoped>
    #job .content {
        padding-top: 20px;
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
    }

    #job .content > .md-card {
        width: 40%;
    }

    #job .content > .md-list {
        width: 55%;
    }
</style>
