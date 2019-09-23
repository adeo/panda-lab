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
                            <md-table-cell md-label="Date">{{ item.timestamp }}</md-table-cell>
                        </md-table-row>
                    </md-table>

                </div>
                <div class="md-layout-item">

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
    </div>


</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, AppVersion} from "pandalab-commons";
    import {Services} from "../../services/services.provider";

    @Component
    export default class AppDetails extends Vue {
        private app: AppModel = null;
        private allVersions: AppVersion[] = [];
        private versions: AppVersion[] = [];
        private flavors: string[] = [];
        private flavor: string = "";

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

            this.$subscribeTo(Services.getInstance().jobsService.listenAppJobs(appId), jobs => {

            })
        }

        protected updateVersions() {
            this.versions = this.allVersions.filter(value => value.flavor === this.flavor)
        }

        openAppDetails() {
            console.log("open app page");
            this.$router.push('applications/' + this.app._ref.id)
        }

        protected onBack() {
            this.$router.back();
        }

    }

</script>
<style lang="css" scoped>

</style>
