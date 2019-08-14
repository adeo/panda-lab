<template>
    <div id="job" v-if="job">
        <md-toolbar>
            <md-button class="md-icon-button" @click="$router.back()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'un job {{ job._id }}</h3>
        </md-toolbar>

        <div class="content">
            <div class="md-card">
                <md-list class="md-double-line">
                    <md-subheader>Informations</md-subheader>
                    <md-list-item>
                        <md-icon class="md-primary">apps</md-icon>
                        <div class="md-list-item-text">
                            <span>Build type : {{ job.apk.buildType }}</span>
                            <span>Flavor : {{ job.apk.flavor }}</span>
                            <span>Package : {{ job.apk.package }}</span>
                        </div>
                    </md-list-item>
                    <md-divider class="md-inset"></md-divider>
                    <md-subheader>Type</md-subheader>
                    <md-list-item>
                        <md-icon class="md-primary">apps</md-icon>
                        <div class="md-list-item-text">
                            <span>Type : {{ job.apk.type }}</span>
                            <span>Version code : {{ job.apk.versionCode }}</span>
                            <span>Version name : {{ job.apk.versionName }}</span>
                        </div>
                    </md-list-item>
                    <md-divider class="md-inset"></md-divider>
                    <md-subheader>Autre</md-subheader>
                    <md-list-item>
                        <md-icon class="md-primary">apps</md-icon>
                        <div class="md-list-item-text">
                            <span>Date: {{ formatTimestamp(job.apk.timestamp.seconds) }}</span>
                            <span>Terminé: {{ job.completed ? 'oui' : 'non' }}</span>
                        </div>
                    </md-list-item>
                </md-list>

            </div>

            <md-list v-if="jobsTasks">
                <md-subheader>Téléphones</md-subheader>

                <div v-for="(jobTask, index) in jobsTasks" v-bind:key="jobTask._id">
                    <md-list-item v-for="jobTask in jobsTasks" v-bind:key="jobTask._id">
                        <md-avatar>
                            <img :src="jobTask.device.pictureIcon ? jobTask.device.pictureIcon : require('../assets/images/device.png')">
                        </md-avatar>

                        <div class="md-list-item-text">
                            <span>{{ jobTask.device.name }}</span>
                            <span>{{ jobTask.device.phoneBrand }}</span>
                            <p>{{ jobTask.device.serialId }}</p>
                        </div>

                        <p v-if="jobTask.status === 'error'">
                            <md-icon class="md-error">error</md-icon>
                        </p>
                        <p v-else>
                            <md-icon class="md-primary">done</md-icon>
                        </p>

                        <md-menu>
                            <md-button md-menu-trigger class="md-icon-button md-primary">
                                <md-icon>more_vert</md-icon>
                            </md-button>
                            <md-menu-content>
                                <md-menu-item @click="onDisplayJobTaskResult(jobTask)">Voir les résultats</md-menu-item>
                            </md-menu-content>
                        </md-menu>
                    </md-list-item>

                    <md-divider v-if="index < (jobsTasks.length - 1)" class="md-inset"></md-divider>
                </div>
            </md-list>
        </div>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {Observable} from "rxjs";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {jobService} from "@/services/job.service";
    import {JobTask} from "@/models/jobs";

    @Component
    export default class Job extends Vue {

        protected get jobId() {
            return this.$route.params.jobId;
        }

        @Subscription()
        protected get job() {
            return jobService.getJob(this.jobId);
        }


        @Subscription()
        protected get jobsTasks(): Observable<JobTask[]> {
            return jobService.getJobsTasks(this.jobId);
        }

        protected onDisplayJobTaskResult(jobTask: JobTask) {
            this.$router.push(`/jobs/${this.jobId}/tasks/${jobTask._id}`);
        }

        protected formatTimestamp(seconds: number) {
            const date = new Date(1970, 0, 1); // Epoch
            date.setSeconds(seconds);
            return date.toLocaleDateString();
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
