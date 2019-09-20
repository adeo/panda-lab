<template>
    <div>
        <md-ripple>

            <md-card>

                <div @click="openAppDetails">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ app.name }}</div>
                            <div class="md-subhead">{{appVersion}}</div>
                        </md-card-header-text>


                        <md-card-media>
                            <md-icon v-if="icon" class="md-size-3x" v-bind:style="{ color : iconColor }">{{icon}}
                            </md-icon>
                        </md-card-media>

                    </md-card-header>
                </div>
            </md-card>

        </md-ripple>

    </div>


</template>
<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel, JobStatus} from "pandalab-commons";
    import {Services} from "../../services/services.provider";

    @Component
    export default class AppCell extends Vue {

        @Prop({required: true}) app: AppModel;


        appVersion: string = "";

        icon: string = "";
        iconColor: string = "";

        mounted() {

            this.$subscribeTo(Services.getInstance().appsService.listenLastAppTest(this.app._ref.id), result => {

                this.appVersion = result.version.versionName;
                switch (result.job.status) {
                    case JobStatus.unstable:
                        this.icon = 'brightness_medium';
                        this.iconColor = 'orange';
                        break;
                    case JobStatus.failure:
                        this.icon = 'cloud';
                        this.iconColor = 'grey';
                        break;
                    case JobStatus.success:
                        this.icon = 'brightness_high';
                        this.iconColor = 'yellow';
                        break;

                }
            })
        }

        openAppDetails() {
            console.log("open app page");
            this.$router.push('applications/' + this.app._ref.id)
        }


    }

</script>
<style lang="css" scoped>

</style>
