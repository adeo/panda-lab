package com.leroymerlin.pandalab.tasks

import com.google.cloud.firestore.DocumentReference
import com.google.cloud.firestore.DocumentSnapshot
import com.google.cloud.firestore.EventListener
import com.google.cloud.firestore.FirestoreException
import com.google.cloud.firestore.ListenerRegistration
import com.google.firebase.cloud.FirestoreClient
import com.google.firebase.cloud.StorageClient
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

import javax.annotation.Nullable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class UploadApk extends DefaultTask {

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
        ListenerRegistration registration = null
        try {
            CountDownLatch called = new CountDownLatch(1)
            registration = getDocumentRef().addSnapshotListener(new EventListener<DocumentSnapshot>() {
                @Override
                void onEvent(@Nullable DocumentSnapshot value, @Nullable FirestoreException error) {
                    if (value.exists()) {
                        called.countDown()
                    }
                }
            })
            def baseFile = getFileName() + ".apk"
            StorageClient.getInstance().bucket()
                    .create("upload/${baseFile}", apkFile.newInputStream())

            assert called.await(30, TimeUnit.SECONDS): "Analyse timeout reached. Check logs on firebase functions"
        } catch (e) {
            throw new GradleException("Can't upload apk : $apkFile", e)
        } finally {
            registration?.remove()
        }


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
