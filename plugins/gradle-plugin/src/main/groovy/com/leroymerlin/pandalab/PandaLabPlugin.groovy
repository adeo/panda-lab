package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
import com.android.build.gradle.api.ApkVariantOutput
import com.android.build.gradle.api.ApplicationVariant
import com.android.build.gradle.internal.dsl.BaseAppModuleExtension
import com.google.auth.oauth2.GoogleCredentials
import com.google.cloud.firestore.*
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.cloud.FirestoreClient
import com.google.firebase.cloud.StorageClient
import groovy.json.JsonSlurper
import groovy.transform.TypeChecked
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
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
                    project.logger.warn("pandalab not configured. Plugin disabled. Add a serviceAccountFile and an appName to fix it")
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
                t.projectId = extension.projectId
                t.serviceAccountFile = extension.serviceAccountFile
        }


        project.extensions.getByType(BaseAppModuleExtension).applicationVariants.all { ApplicationVariant variant ->
            def outputFile = variant.outputs.first()
            def flavorName = variant.flavorName ?: variant.name
            flavorName = flavorName.replaceAll("_", "-")
            if (outputFile instanceof ApkVariantOutput) {
                def bddAppName = extension.appName.replaceAll("_", "-")
                def versionUID = "${flavorName}-${outputFile.versionNameOverride?.replaceAll("_", "-")}-${outputFile.versionCodeOverride}-${extension.versionSuffix?.replaceAll("_", "-")}"
                def buildType = variant.buildType.name.replaceAll("_", "-")


                def type = "release"
                if (variant.testVariant) {
                    type = "debug"
                    project.task(getUploadTaskName(variant.name, "test"),
                            type: UploadApk,
                            group: PANDA_LAB_GROUP,
                            //assembleProvider support old version of android plugin
                            dependsOn: ["setupPandaLab", variant.testVariant.hasProperty("assembleProvider") ? variant.testVariant.assembleProvider.name : variant.testVariant.assemble]
                    ) {
                        UploadApk upTask ->
                            upTask.appName = bddAppName
                            upTask.versionUID = versionUID
                            upTask.flavorName = flavorName
                            upTask.buildType = buildType
                            upTask.apkType = "test"
                            upTask.apkFile = variant.testVariant.outputs.first().outputFile
                    }
                }
                project.task(getUploadTaskName(variant.name, ""),
                        type: UploadApk,
                        group: PANDA_LAB_GROUP,
                        //assembleProvider support old version of android plugin
                        dependsOn: ["setupPandaLab", hasProperty("assembleProvider") ? variant.assembleProvider.name : variant.assemble.name]
                ) {
                    UploadApk upTask ->
                        upTask.appName = bddAppName
                        upTask.versionUID = versionUID
                        upTask.flavorName = flavorName
                        upTask.buildType = buildType
                        upTask.apkType = type
                        upTask.apkFile = variant.outputs.first().outputFile
                }
            }
        }

        project.tasks.withType(PandaLabTest).each {
            testTask ->
                def testUploadTaskName = getUploadTaskName(testTask.variantName, "test")
                def uploadTaskName = getUploadTaskName(testTask.variantName, "debug")
                def upTask = project.tasks.getByName(uploadTaskName)
                if (!upTask) {
                    throw new GradleException("task ${testTask.name} use an invalid variantName ${testTask.variantName}. " +
                            "Available variants are : ${project.extensions.getByType(BaseAppModuleExtension).applicationVariants.findAll { ApplicationVariant it -> it.testVariant }.collect { it.name }.join(", ")}")
                }

                def upTaskTest = project.tasks.getByName(testUploadTaskName)
                if (!upTaskTest) {
                    throw new GradleException("task ${testTask.name} variant name ${testTask.variantName} has no test variant." +
                            "Available variants are : ${project.extensions.getByType(BaseAppModuleExtension).applicationVariants.findAll { ApplicationVariant it -> it.testVariant }.collect { it.name }.join(", ")}")
                }

                testTask.dependsOn.addAll([upTask, upTaskTest])

        }


        project.task("uploadToPandaLab", group: PANDA_LAB_GROUP, dependsOn: project.tasks.withType(UploadApk))
    }

    private static GString getUploadTaskName(String variantName, String type) {
        "upload${variantName.capitalize()}${type.capitalize()}ToPandaLab"
    }

}


class PandaLabExtension {

    File serviceAccountFile
    String storageBucket
    String databaseUrl
    String projectId
    String appName
    String versionSuffix = System.currentTimeMillis()

}


class FirebaseAuthentification extends DefaultTask {
    @Input
    File serviceAccountFile

    @Input
    @Optional
    String projectId

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
        def pid = account['project_id']?.toString() ?: ""

        if (this.projectId) {
            pid = this.projectId
        }
        if (!bucketUrl) {
            bucketUrl = "${pid}.appspot.com"
        }
        if (!databaseUrl) {
            databaseUrl = "https://${pid}.firebaseio.com"
        }

        FirestoreOptions firestoreOptions =
                FirestoreOptions.newBuilder()
                        .setTimestampsInSnapshotsEnabled(true)
                        .build()
        FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .setProjectId(pid)
                .setStorageBucket(bucketUrl)
                .setDatabaseUrl(databaseUrl)
                .setFirestoreOptions(firestoreOptions)
                .build()


        try {
            FirebaseApp.initializeApp(options)
        } catch (e) {
            project.logger.debug("FirebaseApp already initialized", e)
        }

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
    String buildType

    @Input
    String flavorName

    @Input
    String apkType

    @TaskAction
    def uploadFile() {
        ListenerRegistration registration
        try {
            def baseFile = "${appName}_" +
                    "${versionUID}_" +
                    "${flavorName}_" +
                    "${buildType}_" +
                    "${apkType}" +
                    ".apk"


            CountDownLatch called = new CountDownLatch(1)

            def firestore = FirestoreClient.firestore

            registration = firestore.collection("applications")
                    .document(appName)
                    .collection("versions")
                    .document(versionUID)
                    .collection("artifacts")
                    .addSnapshotListener(new EventListener<QuerySnapshot>() {
                        @Override
                        void onEvent(@Nullable QuerySnapshot value, @Nullable FirestoreException error) {
                            def result = value.documentChanges
                                    .findAll { it.type != DocumentChange.Type.REMOVED }
                                    .find {
                                        return it.document.id == baseFile.replace(".apk", "")
                                    }

                            if (result) {
                                called.countDown()
                            }

                        }
                    })

            StorageClient.getInstance().bucket()
                    .create("upload/${baseFile}", apkFile.newInputStream())

            assert called.await(30, TimeUnit.SECONDS): "Analyse timeout reached. Check logs on firebase functions"
        } catch (e) {
            throw new GradleException("Can't upload apk : $apkFile", e)
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


    @TaskAction
    def launchTask() {
        //TODO
    }
}
