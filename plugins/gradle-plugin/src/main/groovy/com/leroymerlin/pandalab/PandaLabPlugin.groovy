package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
import com.android.build.gradle.api.ApkVariantOutput
import com.android.build.gradle.api.ApplicationVariant
import com.android.build.gradle.internal.dsl.BaseAppModuleExtension
import com.leroymerlin.pandalab.tasks.FirebaseAuthentificationTask
import com.leroymerlin.pandalab.tasks.PandaLabTestTask
import com.leroymerlin.pandalab.tasks.UploadApkTask
import groovy.transform.TypeChecked
import org.gradle.api.Plugin
import org.gradle.api.Project

class PandaLabPlugin implements Plugin<Project> {
    static def PANDA_LAB_GROUP = "pandalab"

    Project project
    PandaLabExtension extension

    @TypeChecked
    void apply(Project project) {
        this.project = project
        this.extension = project.extensions.create("pandalab", PandaLabExtension)

        project.extensions.extraProperties.set("PandaLabTestTask", PandaLabTestTask)

        project.plugins.withType(
                AppPlugin, {
            project.afterEvaluate({
                if (!this.extension.serviceAccountFile || !this.extension.appName || !this.extension.apiUrl) {
                    project.logger.warn("pandalab not configured. Plugin disabled. Add a serviceAccountFile, apiUrl and an appName to fix it")
                } else {
                    afterEvaluate()
                }
            })
        })

    }


    @TypeChecked
    def afterEvaluate() {

        project.task("setupPandaLab", type: FirebaseAuthentificationTask, group: PANDA_LAB_GROUP) {
            FirebaseAuthentificationTask t ->
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
                            type: UploadApkTask,
                            group: PANDA_LAB_GROUP,
                            //assembleProvider support old version of android plugin
                            dependsOn: ["setupPandaLab", variant.testVariant.hasProperty("assembleProvider") ? variant.testVariant.assembleProvider.name : variant.testVariant.assemble]
                    ) {
                        UploadApkTask upTask ->
                            upTask.appName = bddAppName
                            upTask.versionUID = versionUID
                            upTask.flavorName = flavorName
                            upTask.buildType = buildType
                            upTask.apkType = "test"
                            upTask.apkFile = variant.testVariant.outputs.first().outputFile
                    }
                }
                project.task(getUploadTaskName(variant.name, ""),
                        type: UploadApkTask,
                        group: PANDA_LAB_GROUP,
                        //assembleProvider support old version of android plugin
                        dependsOn: ["setupPandaLab", hasProperty("assembleProvider") ? variant.assembleProvider.name : variant.assemble.name]
                ) {
                    UploadApkTask upTask ->
                        upTask.appName = bddAppName
                        upTask.versionUID = versionUID
                        upTask.flavorName = flavorName
                        upTask.buildType = buildType
                        upTask.apkType = type
                        upTask.apkFile = variant.outputs.first().outputFile
                }
            }
        }

        project.tasks.withType(PandaLabTestTask).each {
            it.setup()
        }


        project.task("uploadToPandaLab", group: PANDA_LAB_GROUP, dependsOn: project.tasks.withType(UploadApkTask))
    }

    static GString getUploadTaskName(String variantName, String type) {
        "upload${variantName.capitalize()}${type.capitalize()}ToPandaLab"
    }

}


class PandaLabExtension {

    File serviceAccountFile
    String apiUrl
    String storageBucket
    String databaseUrl
    String projectId
    String appName
    String versionSuffix = System.currentTimeMillis()

}





