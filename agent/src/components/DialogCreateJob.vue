<template>
    <div id="dialogCreateJob">
        <md-dialog :md-active="display" v-if="applicationId !== null" style="padding: 24px; min-width: 50%;">
            <md-dialog-title>Créer un job de l'application : {{ applicationId }}</md-dialog-title>
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
    import {DIALOG_CREATE_JOB_DISPLAY_EVENT} from "./events";
    import {Services} from "../services/services.provider";
    import {Artifact} from "pandalab-commons";
    import {filter, flatMap, toArray} from "rxjs/operators";
    import {from} from "rxjs";

    @Component
    export default class DialogCreateJob extends Vue {

        protected display = false;

        private applicationId: string = null;
        private versionId: string = null;
        private artifactSelected: any = {}; // artifact to select
        private loading = false; // notify if create job is launched
        private snackbar = {
            display: false,
            message: '',
            duration: 4000,
            position: 'center',
        };


        private jobService = Services.getInstance().jobsService;

        protected artifacts: Array<Artifact> = [];

        /**
         * When Vue Component is created, register on event : DIALOG_CREATE_JOB_DISPLAY_EVENT
         * This event return two values: application and version for create a new job
         * When this event received, display a dialog
         */
        created() {
            this.$parent.$on(DIALOG_CREATE_JOB_DISPLAY_EVENT, ({applicationId, versionId}) => {
                this.applicationId = applicationId;
                this.versionId = versionId;
                this.display = true;
                this.$forceUpdate();

                const getArtifactsAsync = this.jobService.getArtifactsExcludeRelease(this.applicationId, this.versionId);
                this.$subscribeTo(getArtifactsAsync, artifacts => {
                    this.artifacts = artifacts;
                    this.$forceUpdate();
                }, (error) => {
                    console.error(error);
                    this.$forceUpdate();
                    this.artifacts = [];
                }, () => {
                });
            });
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
            //TODO add form to select devices, groups, timeout, ...
            this.$subscribeTo(this.jobService.createNewJob(this.artifactSelected as Artifact, [], [], 60 * 5, 1), jobId => {
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
        private onClose() {
            this.applicationId = null;
            this.versionId = null;
            this.artifactSelected = {};
            this.loading = false;
            this.display = false;
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
