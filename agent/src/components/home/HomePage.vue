<template>
    <div class="pl-container">
        <div class="md-layout md-alignment-center-center">
            <h2 class="pl-title md-layout-item">Home</h2>
            <md-button @click="addApplication" class="md-fab md-primary">
                <md-icon>edit</md-icon>
            </md-button>
        </div>

        <template v-if="apps.length > 0">
            <div id="app-layout" class="md-layout md-alignment-top-left">
                <div v-for="app in apps" v-bind:key="app._ref.id" class="md-app-cell">
                    <AppCell class="md-medium-size-33"
                             :app="app"></AppCell>
                </div>
            </div>
            <div class="apps-card-container">
            </div>
        </template>
        <template v-else-if="loaded">
            <md-empty-state
                    id="empty"
                    md-icon="apps"
                    md-label="Home not configured"
                    md-description="Add a new application to your home screen">
                <md-button class="md-primary md-raised" @click="addApplication">Add application</md-button>
            </md-empty-state>
        </template>


        <md-dialog :md-active.sync="showDialog">
            <md-dialog-title>Select application</md-dialog-title>
            <md-list>
                <md-list-item v-for="app in allApps" :key="app._ref.id">
                    <md-checkbox v-model="selectedApps" :value="app._ref.id"/>
                    <span class="md-list-item-text">{{app.name}}</span>
                </md-list-item>
            </md-list>
            <md-dialog-actions>
                <md-button class="md-primary" @click="showDialog = false">Close</md-button>
                <md-button class="md-primary" @click="saveApplicationList">Save</md-button>
            </md-dialog-actions>
        </md-dialog>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {Services} from "../../services/services.provider";
    import {AppModel} from "pandalab-commons";
    import {AppsService} from "../../services/apps.service";
    import {UserService} from "../../services/user.service";
    import AppCell from "../apps/AppCell.vue";


    @Component({
        components: {AppCell},
    })
    export default class HomePage extends Vue {
        private appsService: AppsService;
        private userService: UserService;
        private loaded = false;

        protected showDialog = false;

        protected apps: AppModel[] = [];
        protected allApps: AppModel[] = [];

        protected selectedApps = [];

        constructor() {
            super();
            this.userService = Services.getInstance().userService;
            this.appsService = Services.getInstance().appsService;
        }

        mounted() {
            this.$subscribeTo(this.userService.listenHomeApps(), apps => {
                this.apps = apps.sort((a, b) => {
                    if ( a._ref.id < b._ref.id ){
                        return -1;
                    }
                    if ( a._ref.id > b._ref.id ){
                        return 1;
                    }
                    return 0;
                });
                this.selectedApps = this.apps.map(a => a._ref.id);
                this.loaded = true;
            });
            this.$subscribeTo(this.appsService.listenApps(), allApps => {
                this.allApps = allApps;
            })
        }

        protected saveApplicationList() {
            this.showDialog = false;
            this.userService.saveHomeApps(this.selectedApps)
                .subscribe(value => {
                    console.log("Apps saved")
                }, error => {
                    console.error("Can't save apps", error)
                })
        }

        protected addApplication() {
            this.showDialog = true;
        }

    }


</script>
<style scoped lang="scss">


</style>
