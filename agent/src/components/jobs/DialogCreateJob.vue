<template>
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="$router.back()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Create Job
                </h2>
                <div>
                    <md-button class="md-raised md-primary" @click="onSubmit()" :disabled="loading || finish">
                        {{ loading ? 'Loading' : (finish ? 'Job is created' : 'Create') }}
                    </md-button>
                </div>
            </div>
            <div class="md-layout-item md-layout md-gutter">
                <div v-if="artifacts" class="md-layout-item md-size-100">
                    <div>
                        <small>Flavor : </small>
                    </div>
                    <md-radio v-model="artifactSelected" v-for="artifact in artifacts" v-bind:key="artifact.path" v-bind:value="artifact">{{ artifact.buildType }}</md-radio>
                </div>
                <div v-if="devices.length > 0" class="md-layout-item md-size-100">
                    <md-table v-model="devices" md-card md-sort="status" md-sort-order="asc"
                              md-fixed-header
                              @md-selected="onSelectDevices" md-item
                              :md-selected-value-="devices"
                              :md-selected-value.sync="selectedDevices">
                        <md-table-toolbar>
                            <h1 class="md-title">Devices</h1>
                        </md-table-toolbar>
                        <md-table-row slot="md-table-row" slot-scope="{ item }" md-selectable="multiple"
                                      md-auto-select>
                            <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                            <md-table-cell md-label="Brand" md-sort-by="phoneBrand">{{ item.phoneBrand }}
                            </md-table-cell>
                            <md-table-cell md-label="Model" md-sort-by="phoneModel">{{ item.phoneModel }}
                            </md-table-cell>
                            <md-table-cell md-label="Status" md-sort-by="status">{{ item.status }}
                            </md-table-cell>
                        </md-table-row>
                    </md-table>
                </div>
            </div>
        </div>
        <md-snackbar :md-position="snackbar.position" :md-duration="snackbar.duration"
                     :md-active.sync="snackbar.display" md-persistent>
            <span>{{ snackbar.message }}</span>
            <md-button class="md-primary" @click="onClose()">Fermer</md-button>
        </md-snackbar>
    </div>

</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {Artifact, Device} from "pandalab-commons";

    @Component
    export default class DialogCreateJob extends Vue {

        private applicationId: string = null;
        private versionId: string = null;
        private artifactSelected: any = {}; // artifact to select
        private loading = false; // notify if create job is launched
        private finish = false;
        private snackbar = {
            display: false,
            message: '',
            duration: Infinity,
            position: 'center',
        };
        private devices: Device[] = [];
        private selectedDevices: Device[] = [];

        private jobService = Services.getInstance().jobsService;
        private devicesService = Services.getInstance().devicesService;

        protected artifacts: Array<Artifact> = [];

        /**
         * When Vue Component is created, register on event : DIALOG_CREATE_JOB_DISPLAY_EVENT
         * This event return two values: application and version for create a new job
         * When this event received, display a dialog
         */
        mounted() {
            this.applicationId = this.$route.params.applicationId;
            this.versionId = this.$route.params.versionId;
            this.$forceUpdate();

            const getArtifactsAsync = this.jobService.getArtifactsExcludeRelease(this.applicationId, this.versionId);
            this.$subscribeTo(getArtifactsAsync, artifacts => {
                this.artifacts = artifacts;
                if (this.artifacts.length > 0) {
                    this.artifactSelected = this.artifacts[0];
                }
                this.$forceUpdate();
            }, (error) => {
                console.error(error);
                this.$forceUpdate();
                this.artifacts = [];
            }, () => {
            });

            this.$subscribeTo(this.devicesService.listenDevices(), devices => {
                this.devices = devices;
                this.$forceUpdate();
            });
        }

        onSelectDevices(devices: Device[]) {
            this.selectedDevices = devices;
            this.selectedDevices.forEach(device => console.log(`Select ${device.name}`));
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
            const devices = this.selectedDevices.map(device => device._ref.id);
            console.log("select devices : ", devices);
            this.$subscribeTo(this.jobService.createNewJob(this.artifactSelected as Artifact, devices, [], 60 * 5, devices.length > 0 ? devices.length : 1), jobId => {
                console.log(`Create job id = ${jobId}`);
                // this.onClose();
                this.snackbar.message = `Le job ${jobId} a bien été créé`;
                this.snackbar.display = true;
                this.loading = false;
                this.finish = true;
                this.$forceUpdate();
            }, reason => {
                console.error(reason);
                this.onClose();
                this.loading = false;
                this.snackbar.message = `Impossible de créer le job !`;
                this.snackbar.display = true;
                this.$forceUpdate();
            });
        }

        /**
         * Reset all variables
         */
        private onClose() {
            this.$router.back();
        }
    }

</script>
<style>

    .progress-container .md-progress-spinner {
        width: 20px;
        height: 20px;
    }

</style>
