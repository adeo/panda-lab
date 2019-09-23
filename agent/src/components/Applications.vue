<template>
    <div id="applications">
        <div class="list" v-if="applications">
            <md-list :md-expand-single="true">
                <md-list-item md-expand v-for="(application) in applications" v-bind:key="application.id">
                    <md-icon>videogame_asset</md-icon>
                    <span class="md-list-item-text">{{ application.id }}</span>
                    <md-list slot="md-expand">
                        <md-list-item class="md-inset" v-for="version in application.versions"
                                      v-bind:key="version.id" @click="onClickVersion(version)">
                            <div class="md-list-item-text">
                                <span>Version : {{ version.versionName }}</span>
                                <span>Flavor : {{ version.flavor }}</span>
                                <p>Version code : {{ version.versionCode }}</p>
                            </div>
                            <md-menu>
                                <md-button md-menu-trigger class="md-icon-button md-primary">
                                    <md-icon>more_vert</md-icon>
                                </md-button>
                                <md-menu-content>
                                    <md-menu-item @click="onClickCreateJob(application, version)">Créer un job
                                    </md-menu-item>
                                    <md-menu-item @click="onClickDisplayJobs(application, version)">Consulter les jobs
                                    </md-menu-item>
                                </md-menu-content>
                            </md-menu>
                        </md-list-item>
                    </md-list>
                </md-list-item>
            </md-list>
        </div>
        <p v-else-if="loading">Chargement...</p>
        <p v-else>Pas d'application</p>
        <dialog-create-job v-bind:display="createJob !== null"/>
    </div>
</template>
<script lang="ts">

    import {Component, Emit, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {from, of} from "rxjs";
    import * as firebase from "firebase";
    import {catchError, flatMap, map, tap, toArray} from "rxjs/operators";
    import DialogCreateJob from "@/components/DialogCreateJob.vue";
    import {DIALOG_CREATE_JOB_DISPLAY_EVENT} from "./events";
    import "rxjs-compat/add/operator/scan";
    import {Services} from "../services/services.provider";
    import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

    @Component({
        components: {DialogCreateJob}
    })
    export default class Applications extends Vue {

        loading !: boolean;
        createJob: any = null;

        private jobService = Services.getInstance().jobsService;

        onClickVersion(version: any) {

        }

        @Emit(DIALOG_CREATE_JOB_DISPLAY_EVENT)
        async onClickCreateJob(application: any, version: any) {
            return {
                applicationId: application.id,
                versionId: version.id,
            };
        }

        onClickDisplayJobs(application, version: any) {
            this.jobService.getJobs(application.id, version.id)
                .subscribe(console.log);
        }

        @Subscription()
        protected get applications() {

            this.loading = true;

            return from(firebase.firestore().collection('applications').get())
                .pipe(
                    map(snapshot => snapshot.docs),
                    flatMap(from), // flatMap iterate
                    flatMap(async (documentSnapshot: QueryDocumentSnapshot) => {
                        const applicationId = documentSnapshot.id;
                        const versionsSnapshot = await documentSnapshot.ref.collection('versions').get();
                        const versions = await Promise.all(versionsSnapshot.docs.map(async version => {
                            const versionId = version.id;
                            const artifactsSnapshot = await version.ref.collection('artifacts').get();
                            const artifacts = artifactsSnapshot.docs.map(artifactSnapshot => {
                                const id = artifactSnapshot.id;
                                return {
                                    id,
                                    ...artifactSnapshot.data()
                                };
                            });
                            return {
                                _ref: version.ref,
                                id: versionId,
                                ...version.data(),
                                artifacts,
                            };
                        }));
                        return {
                            _ref: documentSnapshot.ref,
                            id: applicationId,
                            versions
                        };
                    }),
                    toArray(),
                    tap(() => {
                        this.loading = false;
                        this.$forceUpdate();
                    }),
                    catchError((err) => {
                        console.log(err);
                        this.loading = false;
                        this.$forceUpdate();
                        return of();
                    }),
                );
        }


    }

</script>
<style lang="css" scoped>

    #applications {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap-reverse;
        justify-content: center;
    }

    #applications .list {
        width: 60%;
    }

</style>
