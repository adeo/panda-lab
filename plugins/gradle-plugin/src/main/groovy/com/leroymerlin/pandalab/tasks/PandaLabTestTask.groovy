package com.leroymerlin.pandalab.tasks

import com.android.build.gradle.api.ApplicationVariant
import com.android.build.gradle.internal.dsl.BaseAppModuleExtension
import com.google.firebase.cloud.FirestoreClient
import com.leroymerlin.pandalab.PandaLabPlugin
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

class PandaLabTestTask extends DefaultTask {
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


    @TaskAction
    def launchTask() {

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
            throw new GradleException("Can't create test job. Error code ${code} received.")
        }

        if (waitForResult) {
            def doc = FirebaseHelper.syncListener(FirestoreClient.firestore.collection("jobs").document(resp['jobId'] as String),
                    timeoutInSecond,
                    { document ->
                        return document.exists() && document.getBoolean("completed")
                    })

            def testStatus = doc.getString("status")
            logger.info("Test finish with status : ${testStatus}")
            if (testStatus == "failure") {
                throw new GradleException("Tests failed. Check test report.")
            }
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
