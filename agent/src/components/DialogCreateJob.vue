<template>
    <div id="dialogCreateJob">
        <md-dialog :md-active="display" v-if="application" style="padding: 24px; min-width: 50%;">
            <md-dialog-title>Créer un job de l'application : {{ application.id }}</md-dialog-title>
            <div v-if="artifacts">
                <md-radio v-model="artifactSelected" v-for="artifact in artifacts" v-bind:key="artifact.path"
                          v-bind:value="artifact">{{ artifact.buildType }}
                </md-radio>
            </div>

            <div v-if="loading" class="progress-container">
                <span>
                    <md-progress-spinner v-if="loading" md-mode="indeterminate" :md-diameter="20"
                                         :md-stroke="2"></md-progress-spinner>
                    Création du job en cours...
                </span>
            </div>

            <md-dialog-actions>
                <md-button class="md-primary" @click="onClose()">Close</md-button>
                <md-button type="submit" class="md-primary" @click="onSubmit()"
                           v-bind:disabled="loading || artifactSelected.id === null">Save
                </md-button>
            </md-dialog-actions>
        </md-dialog>
        <md-snackbar :md-position="snackbar.position" :md-duration="snackbar.duration"
                     :md-active.sync="snackbar.display" md-persistent>
            <span>{{ snackbar.message }}</span>
            <md-button class="md-primary" @click="snackbar.display = false">Fermer</md-button>
        </md-snackbar>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import {jobService} from "@/services/job.service";
    import {ObservableMethod, Subscription} from "vue-rx-decorators";
    import {from, Subscription as RxSubscription} from "rxjs";
    import {DIALOG_CREATE_JOB_DISPLAY_EVENT} from "@/components/events";

    @Component
    export default class DialogCreateJob extends Vue {

        protected display = false;

        private application: any = {}; // application selected
        private version: any = {}; // version selected
        private artifactSelected: any = {}; // artifact to select
        private loading = false; // notify if create job is launched
        private snackbar = {
            display: false,
            message: '',
            duration: 4000,
            position: 'center',
        };


        private createJobSubscription: RxSubscription;

        @ObservableMethod()
        private applicationVersion: ObservableMethod;

        /**
         * This subscription retrieve all artifacts with application and version id.
         * This observable is updated when the ObservableMethod pplicationVersion is called
         */
        @Subscription()
        protected get artifacts() {
            return this.applicationVersion
                .flatMap(value => jobService.getArtifacts(value.application.id, value.version.id));
        }

        /**
         * When Vue Component is created, register on event : DIALOG_CREATE_JOB_DISPLAY_EVENT
         * This event return two values: application and version for create a new job
         * When this event received, display a dialog
         */
        created() {
            this.$parent.$on(DIALOG_CREATE_JOB_DISPLAY_EVENT, ({application, version}) => {
                this.applicationVersion({
                    application,
                    version,
                });
                this.application = application;
                this.version = version;
                this.display = true;
                this.$forceUpdate();
            });
        }

        destroyed() {
            this.unsubscribeCreateJob();
        }

        /**
         * Submit form
         * 1. Display Loader
         * 2. Hide current error if needed
         * 3. Create job with application, version and artifact id
         * 4. Close dialog if success and display snackbar with current job id
         * 5. Display error in snackbar if createJob has failed
         */
        onSubmit() {
            this.loading = true;
            const createJob = jobService.createJob(this.application.id, this.version.id, this.artifactSelected.id);
            this.createJobSubscription = from(createJob)
                .delay(3000)
                .subscribe(jobId => {
                    console.log(`Create job id = ${jobId}`);
                    this.onClose();
                    this.snackbar.message = `Le job ${jobId} a bien été créé`;
                    this.snackbar.display = true;
                    this.$forceUpdate();
                }, reason => {
                    console.error(reason);
                    this.onClose();
                    this.snackbar.message = `Impossible de créer le job !`;
                    this.snackbar.display = true;
                });
        }

        /**
         * Reset all variables
         */
        onClose() {
            this.application = {};
            this.artifactSelected = {};
            this.loading = false;
            this.display = false;
        }

        /**
         * Unsubscribe current subscription : CreateJob
         */
        private unsubscribeCreateJob() {
            if (this.createJobSubscription) {
                this.createJobSubscription.unsubscribe();
            }
        }

    }

</script>
<style>
    #dialogCreateJob .progress-container {
        width: 20px;
        height: 20px;
        display: -webkit-box;
    }

    #dialogCreateJob .progress-container .md-progress-spinner {
        width: 20px;
        height: 20px;
    }

</style>
