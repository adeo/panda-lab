package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
import com.android.build.gradle.api.ApkVariantOutput
import com.android.build.gradle.api.ApplicationVariant
import com.android.build.gradle.internal.dsl.BaseAppModuleExtension
import com.google.auth.oauth2.GoogleCredentials
import com.google.cloud.firestore.*
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.cloud.StorageClient
import groovy.json.JsonSlurper
import groovy.transform.TypeChecked
import org.gradle.api.DefaultTask
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.TaskAction

import javax.annotation.Nullable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class PandaLabPlugin implements Plugin<Project> {
    static def PANDA_LAB_GROUP = "pandalab"

    Project project
    PandaLabExtension extension

    @TypeChecked
    void apply(Project project) {
        this.project = project
        this.extension = project.extensions.create("pandalab", PandaLabExtension)

        project.plugins.withType(
                AppPlugin, {
            project.afterEvaluate({
                if (!this.extension.serviceAccountFile || !this.extension.appName) {
                    project.logger.warn("Panda lab endpoint not configured. Plugin disabled")
                } else {
                    afterEvaluate()
                }
            })
        })

    }


    @TypeChecked
    def afterEvaluate() {

        project.task("setupPandaLab", type: FirebaseAuthentification, group: PANDA_LAB_GROUP) {
            FirebaseAuthentification t ->
                t.bucketUrl = extension.storageBucket
                t.databaseUrl = extension.databaseUrl
                t.serviceAccountFile = extension.serviceAccountFile
        }

        project.extensions.getByType(BaseAppModuleExtension).applicationVariants.all { ApplicationVariant variant ->
            def outputFile = variant.outputs.first()
            def flavorName = variant.flavorName ?: project.name
            flavorName = flavorName.replaceAll("_", "-")
            if (outputFile instanceof ApkVariantOutput) {
                def bddAppName = extension.appName.replaceAll("_", "-")
                def versionUID = "${extension.versionPrefix?.replaceAll("_", "-")}-${outputFile.versionNameOverride?.replaceAll("_", "-")}-${outputFile.versionCodeOverride}-${flavorName}"
                def variantName = variant.buildType.name.replaceAll("_", "-")


                def type = "release"
                if (variant.testVariant) {
                    type = "debug"
                    project.task("upload${flavorName.capitalize()}${outputFile.name.capitalize()}ToPandaLab",
                            type: UploadApk,
                            group: PANDA_LAB_GROUP,
                            dependsOn: ["setupPandaLab", variant.assembleProvider.name]
                    ) {
                        UploadApk upTask ->
                            upTask.appName = bddAppName
                            upTask.versionUID = versionUID
                            upTask.variantName = variantName
                            upTask.apkType = "test"
                            upTask.apkFile = variant.testVariant.outputs.first().outputFile
                    }
                }
                project.task("upload${flavorName.capitalize()}${outputFile.name.capitalize()}ToPandaLab",
                        type: UploadApk,
                        group: PANDA_LAB_GROUP,
                        dependsOn: ["setupPandaLab", variant.assembleProvider.name]
                ) {
                    UploadApk upTask ->
                        upTask.appName = bddAppName
                        upTask.versionUID = versionUID
                        upTask.variantName = variantName
                        upTask.apkType = type
                        upTask.apkFile = variant.testVariant.outputs.first().outputFile
                }
            }
        }

        project.task("uploadToPandaLab", group: PANDA_LAB_GROUP, dependsOn: project.tasks.withType(UploadApk))
    }

}


class PandaLabExtension {

    File serviceAccountFile
    String storageBucket
    String databaseUrl
    String appName
    String versionPrefix = System.currentTimeMillis()

}


class FirebaseAuthentification extends DefaultTask {
    @Input
    File serviceAccountFile

    @Input
    @Optional
    String bucketUrl

    @Input
    @Optional
    String databaseUrl

    @TaskAction
    @TypeChecked
    def login() {
        FileInputStream serviceAccount =
                new FileInputStream(serviceAccountFile)

        def account = new JsonSlurper().parse(serviceAccountFile)

        if (!bucketUrl) {
            bucketUrl = account['project_id'] + ".appspot.com"
        }
        if (!databaseUrl) {
            databaseUrl = "https://${account['project_id']}.firebaseio.com"
        }

        FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .setStorageBucket(bucketUrl)
                .setDatabaseUrl(databaseUrl)
                .build()

        FirebaseApp.initializeApp(options)

    }
}

class UploadApk extends DefaultTask {

    @Input
    File apkFile

    @Input
    String appName

    @Input
    String versionUID

    @Input
    String variantName

    @Input
    String apkType

    @TaskAction
    def uploadFile() {
        ListenerRegistration registration
        try {
            def baseFile = "${appName}_" +
                    "${versionUID}_" +
                    "${variantName}_" +
                    "${apkType}" +
                    ".apk"


            StorageClient.getInstance().bucket()
                    .create("upload/${baseFile}", apkFile.newInputStream())

            CountDownLatch called = new CountDownLatch(1)

            registration = Firestore.newInstance().collection("applications")
                    .document(appName)
                    .collection("version")
                    .document(versionUID)
                    .collection("artifacts")
                    .addSnapshotListener(new EventListener<QuerySnapshot>() {
                        @Override
                        void onEvent(@Nullable QuerySnapshot value, @Nullable FirestoreException error) {
                            def result = value.documentChanges.findAll { it -> it.type != DocumentChange.Type.REMOVED }
                                    .find { it.document.id == baseFile }

                            if (result) {
                                called.countDown()
                            }

                        }
                    })

            assert called.await(20, TimeUnit.SECONDS): "Analyse timeout reached. Check logs on firebase functions"
        } catch (e) {
            project.logger.error("Can't upload apk : $apkFile", e)
        } finally {
            registration?.remove()
        }


    }

}


class PandaLabTest extends DefaultTask {
    @Input
    String variantName

    @Input
    Boolean blocking

    @Input
    Long timeoutInSecond




    //TODO implement test setup
}
