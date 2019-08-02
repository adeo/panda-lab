package com.leroymerlin.pandalab.tasks

import com.android.build.gradle.api.ApplicationVariant
import com.android.build.gradle.internal.dsl.BaseAppModuleExtension
import com.google.auth.oauth2.GoogleCredentials
import com.google.cloud.firestore.DocumentSnapshot
import com.google.cloud.firestore.EventListener
import com.google.cloud.firestore.FirestoreException
import com.google.firebase.cloud.FirestoreClient
import com.leroymerlin.pandalab.PandaLabPlugin
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

import javax.annotation.Nullable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class PandaLabTest extends DefaultTask {
    @Input
    String variantName

    @Input
    Boolean waitForResult = true

    @Input
    Long timeoutInSecond = 15 * 60

    @Input
    List<String> groups = []

    @Input
    List<String> devices = []


    private DocumentSnapshot testData

    @TaskAction
    def launchTask() {
        def registration = null
        try {

            GoogleCredentials.create()

            def uploadTaskName = PandaLabPlugin.getUploadTaskName(variantName, "")
            def upTask = project.tasks.getByName(uploadTaskName)
            def body = [artifact: upTask.getDocumentRef().path, group: groups ?: [], devices: devices ?: []]


            String apiUrl = project.pandalab.apiUrl
            if (!apiUrl.startsWith("http")) {
                apiUrl = "https://${apiUrl}"
            }
            def req = new URL(apiUrl + "/api/createJob").openConnection()
            req.setRequestMethod("POST")
            req.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            String apiKey = FirestoreClient.firestore.collection("config").document("secrets").get().get().getString("apiKey")
            req.addRequestProperty("X-API-KEY", apiKey)
            req.setDoOutput(true)
            req.getOutputStream().write(JsonOutput.toJson(body).getBytes("UTF-8"))
            int code = req.getResponseCode()
            logger.quiet "Status code: ${code}" // HTTP request done one first read
            def resp = new JsonSlurper().parseText(req.getInputStream().getText())
            logger.quiet "Response: ${resp}"
            if (code != 200) {
                throw new IllegalStateException("Error code ${code} received.")
            }

            if (waitForResult) {
                CountDownLatch called = new CountDownLatch(1)
                registration = upTask.getDocumentRef().parent.parent.addSnapshotListener(new EventListener<DocumentSnapshot>() {
                    @Override
                    void onEvent(@Nullable DocumentSnapshot value, @Nullable FirestoreException error) {
                        if (value.exists() && value.getBoolean("completed")) {
                            testData = value
                            called.countDown()

                        }
                    }
                })
                assert called.await(timeoutInSecond, TimeUnit.SECONDS): "Timeout reached"
                if (testData.getString("status") != "failure") {
                    throw new IllegalStateException("Tests finished with error.")
                }
            }
        } catch (e) {
            throw new GradleException("Test task failed", e)
        } finally {
            registration?.remove()
        }
    }


    void setup() {
        def testUploadTaskName = PandaLabPlugin.getUploadTaskName(variantName, "test")
        def uploadTaskName = PandaLabPlugin.getUploadTaskName(variantName, "")
        try {
            def upTask = project.tasks.getByName(uploadTaskName)
            dependsOn.add(upTask)
        } catch (e) {
            throw new GradleException("task ${name} use an invalid variantName ${variantName}. " +
                    "Available variants are : ${project.extensions.getByType(BaseAppModuleExtension).applicationVariants.findAll { ApplicationVariant it -> it.testVariant }.collect { it.name }.join(", ")}", e)
        }

        try {
            def upTaskTest = project.tasks.getByName(testUploadTaskName)
            dependsOn.add(upTaskTest)
        } catch (e) {
            throw new GradleException("task ${name} variant name ${variantName} has no test variant." +
                    "Available variants are : ${project.extensions.getByType(BaseAppModuleExtension).applicationVariants.findAll { ApplicationVariant it -> it.testVariant }.collect { it.name }.join(", ")}", e)
        }

    }

}
