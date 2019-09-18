<template>
    <div id="create-job">
        <md-dialog :md-active="showCreateJobDialog" style="padding: 24px; min-width: 50%;">
            <md-dialog-title>Ajouter un job</md-dialog-title>
            <div>
                <md-field>
                    <label for="app-name">Application name</label>
                    <md-input name="app-name" id="app-name" v-model="files.appName" :disabled="sending"/>
                </md-field>
                <md-field>
                    <label for="version-name">Version name</label>
                    <md-input name="app-name" id="version-name" v-model="files.versionName" :disabled="sending"/>
                </md-field>
                <md-field>
                    <label>Apk</label>
                    <md-file accept="application/vnd.android.package-archive"
                             @change="onChoiceFile('apk', $event.target.files[0])" :disabled="sending"/>
                </md-field>
                <md-field>
                    <label>Apk de test</label>
                    <md-file accept="application/vnd.android.package-archive"
                             @change="onChoiceFile('test', $event.target.files[0])" :disabled="sending"/>
                </md-field>
                <md-field>
                    <label>Apk de release</label>
                    <md-file accept="application/vnd.android.package-archive"
                             @change="onChoiceFile('release', $event.target.files[0])" :disabled="sending"/>
                </md-field>
            </div>
            <md-progress-spinner md-mode="determinate" :md-value="percent"></md-progress-spinner>
            <md-dialog-actions>
                <md-button class="md-primary" @click="showCreateJobDialog = false">Close</md-button>
                <md-button type="submit" class="md-primary" @click="onSubmit()">Save</md-button>
            </md-dialog-actions>
        </md-dialog>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    // import {CREATE_JOB_EVENT_DISPLAY} from "./events";
    // import {firebaseService, UploadApplicationProgress, UploadApplications} from "@/services/firebase.service";
    // import {Subscription as RxSubscription} from "rxjs";
    // import {Guid} from "guid-typescript";
    // import {CREATE_JOB_EVENT_DISPLAY} from "@/components/events";

    @Component
    export default class CreateJob extends Vue {

        // showCreateJobDialog: boolean = false;
        //
        // private files!: any;
        // private sending = false;
        // private uploadSubscription?: RxSubscription;
        // private percent = 0;
        //
        // constructor() {
        //     super();
        //     this.resetUploadApplications();
        // }
        //
        // created() {
        //     this.$parent.$on(CREATE_JOB_EVENT_DISPLAY, () => {
        //         this.showCreateJobDialog = true;
        //     });
        //
        // }
        //
        //
        // destroyed() {
        //     this.unsubscribeUpload();
        // }
        //
        // private resetUploadApplications() {
        //     this.files = {
        //         appName: '',
        //         versionName: '',
        //     };
        // }
        //
        // private unsubscribeUpload() {
        //     if (this.uploadSubscription) {
        //         this.uploadSubscription.unsubscribe();
        //     }
        // }
        //
        // private onChoiceFile(key: string, file: string) {
        //     this.files[key] = file;
        // }
        //
        // private onSubmit() {
        //     // lock all field
        //     const guid = Guid.create().toString();
        //
        //     const progress = {};
        //
        //     const onUploadInfos = (info: UploadApplicationProgress) => {
        //         console.log(info);
        //         progress[info.file.name] = info.percent;
        //
        //         const keys = Object.keys(progress);
        //         let sum = 0;
        //         for (const key of keys) {
        //             sum += progress[key];
        //         }
        //         this.percent = sum / keys.length;
        //     };
        //
        //     const onFinish = (error: Error | null = null) => {
        //         this.sending = false;
        //         this.showCreateJobDialog = false;
        //         if (error) {
        //             console.error(error);
        //         } else {
        //             console.log(`Finish`);
        //         }
        //     };
        //
        //     this.unsubscribeUpload();
        //
        //     this.uploadSubscription = firebaseService
        //         .uploadFiles(guid, this.files)
        //         .subscribe(onUploadInfos, onFinish, onFinish);
        // }
    }

</script>




