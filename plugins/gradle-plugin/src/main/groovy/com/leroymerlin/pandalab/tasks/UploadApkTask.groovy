package com.leroymerlin.pandalab.tasks

import com.google.cloud.firestore.DocumentReference
import com.google.cloud.storage.BlobInfo
import com.google.cloud.storage.Bucket
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

        def bucket = StorageClient.getInstance().bucket()
        BlobInfo blobInfo = BlobInfo.newBuilder(bucket, "upload/${baseFile}")
                .setContentType("application/vnd.android.package-archive")
                .setMetadata(["appName": appName, "uuid": versionUID, "buildType": buildType, "flavor": flavorName, "type": apkType])
                .build()

        bucket.getStorage()
                .create(blobInfo, apkFile.readBytes())

        FirebaseHelper.syncListener(
                getDocumentRef(),
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
