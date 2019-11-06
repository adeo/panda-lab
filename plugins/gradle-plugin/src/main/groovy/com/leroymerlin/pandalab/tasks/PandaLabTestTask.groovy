package com.leroymerlin.pandalab.tasks


import com.google.firebase.cloud.FirestoreClient
import com.leroymerlin.pandalab.PandaLabPlugin
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

import java.util.concurrent.TimeUnit

class PandaLabTest {
    PandaLabTest(String name) {
        this.name = name;
    }

    String name
    String variantName
    Boolean waitForResult = true
    Long timeoutInSecond = TimeUnit.HOURS.toSeconds(3)
    List<String> groups = []
    List<String> devices = []
    Long devicesCount = 0
    boolean enable = true;
}


class PandaLabTestTask extends DefaultTask {
    @Input
    PandaLabTest data

//    @TypeChecked
    @TaskAction
    def launchTask() {

        def uploadTaskName = PandaLabPlugin.getUploadTaskName(data.variantName, "")
        def upTask = project.tasks.getByName(uploadTaskName) as UploadApkTask
        def body = [
                artifact       : upTask.getDocumentRef().path,
                groups         : data.groups ?: [],
                devices        : data.devices ?: [],
                devicesCount   : data.devicesCount,
                timeoutInSecond: data.timeoutInSecond
        ]

        String apiUrl = project.pandalab.apiUrl
        if (!apiUrl.startsWith("http")) {
            apiUrl = "https://${apiUrl}"
        }
        def req = new URL(apiUrl + "/api/job").openConnection()
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

        if (data.waitForResult) {
            def doc = FirebaseHelper.syncListener(FirestoreClient.firestore.collection("jobs").document(resp['jobId'] as String),
                    data.timeoutInSecond,
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


}
