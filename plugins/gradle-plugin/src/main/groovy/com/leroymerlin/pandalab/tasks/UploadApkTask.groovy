package com.leroymerlin.pandalab.tasks

import com.google.cloud.firestore.DocumentReference
import com.google.firebase.cloud.FirestoreClient
import com.google.firebase.cloud.StorageClient
import org.gradle.api.DefaultTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

class UploadApkTask extends DefaultTask {

    @Input
    File apkFile

    @Input
    String appName

    @Input
    String versionUID

    @Input
    String buildType

    @Input
    String flavorName

    @Input
    String apkType


    @TaskAction
    def uploadFile() {
        def baseFile = getFileName() + ".apk"
        StorageClient.getInstance().bucket()
                .create("upload/${baseFile}", apkFile.newInputStream())
        FirebaseHelper.syncListener(getDocumentRef(),
                30,
                {
                    return it.exists()
                })
    }

    protected GString getFileName() {
        return "${appName}_" +
                "${versionUID}_" +
                "${flavorName}_" +
                "${buildType}_" +
                "${apkType}"
    }

    protected DocumentReference getDocumentRef() {
        def firestore = FirestoreClient.firestore
        return firestore.collection("applications")
                .document(appName)
                .collection("versions")
                .document(versionUID)
                .collection("artifacts")
                .document(getFileName())
    }
}
