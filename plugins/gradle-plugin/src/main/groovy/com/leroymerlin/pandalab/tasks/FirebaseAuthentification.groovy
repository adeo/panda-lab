package com.leroymerlin.pandalab.tasks

import com.google.auth.oauth2.GoogleCredentials
import com.google.cloud.firestore.FirestoreOptions
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import groovy.json.JsonSlurper
import groovy.transform.TypeChecked
import org.gradle.api.DefaultTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.TaskAction

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
        def credentials = GoogleCredentials.fromStream(serviceAccount)
        FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(credentials)
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
