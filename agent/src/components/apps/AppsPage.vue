<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <h2 class="pl-title">Applications</h2>
            <template v-if="apps">
                <div id="app-layout" class="md-layout md-alignment-top-left">
                    <div v-for="app in apps" v-bind:key="app._ref.id" class="md-app-cell">
                        <AppCell class="md-medium-size-33"
                                 :app="app"></AppCell>
                    </div>
                </div>
                <div class="apps-card-container">
                </div>
            </template>
            <template v-else>
                <md-empty-state
                        md-rounded
                        md-icon="apps"
                        md-label="No application found"
                        md-description="Upload artifacts to create you first app">
                </md-empty-state>
            </template>
        </div>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AppModel} from "pandalab-commons";
    import AppCell from "./AppCell.vue";
    import {Services} from "../../services/services.provider";

    @Component({
        components: {AppCell},
    })
    export default class AppsPage extends Vue {
        private apps: AppModel[] = [];

        mounted() {


            this.$subscribeTo(Services.getInstance().appsService.listenApps(), apps => {
                this.apps = apps;
            })


        }



    }

</script>
<style lang="css" scoped>
    .md-layout {
        margin: 10px;
    }

    .md-app-cell {
        padding-left: 8px;
        padding-right: 8px;
    }

    #app-layout{
        margin: 0px;
    }
</style>
