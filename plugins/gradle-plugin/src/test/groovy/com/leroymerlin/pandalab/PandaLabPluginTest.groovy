package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
import com.leroymerlin.pandalab.tasks.FirebaseAuthentification
import com.leroymerlin.pandalab.tasks.PandaLabTest
import com.leroymerlin.pandalab.tasks.UploadApk
import org.gradle.api.Project
import org.gradle.internal.impldep.org.apache.http.util.Asserts
import org.gradle.testfixtures.ProjectBuilder
import org.junit.After
import org.junit.Before
import org.junit.Test

class PandaLabPluginTest {

    Project project


    @Before
    void setUp() {
        project = ProjectBuilder.builder().build()
        def manager = project.pluginManager
        manager.apply(AppPlugin)
        manager.apply(PandaLabPlugin)


        project.android {
            compileSdkVersion 25
        }
    }

    @After
    void tearDown() {
        project = null
    }


    @Test
    void testExtensionExist() {
        project.evaluate()
        Asserts.notNull(project.extensions.getByName("pandalab"), "extension not created")
    }

    @Test
    void testGenerateTasks() {
        def pandalab = project.extensions.getByType(PandaLabExtension)

        pandalab.endpoint = "https://laburl.com?appName=myAppName&token=secureToken"
        project.evaluate()

    }


    @Test
    void testFirebase() {
        def pandalab = project.extensions.getByType(PandaLabExtension)
        def authent = project.task("testAuthent", type: FirebaseAuthentification) {
            serviceAccountFile = new File("../../.config/firebase-adminsdk.json")
            bucketUrl = "panda-lab-lm.appspot.com"
            apiUrl = "https://us-central1-panda-lab-lm.cloudfunctions.net"
        }
        authent.login()

        def testFile = File.createTempFile("temp", ".apk")
        testFile << "Hello world"    // write to the temp file

        def upload = project.task("testUpload", type: UploadApk) {
            apkFile = testFile
            uploadName = "test.apk"
        }


        upload.uploadFile()
        testFile.delete()


    }

    @Test
    void testPandalabTest() {
        def pandalab = project.extensions.getByType(PandaLabExtension)

        pandalab.apiUrl = "https://us-central1-panda-lab-lm.cloudfunctions.net"
        def authent = project.task("testAuthent", type: FirebaseAuthentification) {
            serviceAccountFile = new File("../../.config/firebase-adminsdk.json")
            bucketUrl = "panda-lab-lm.appspot.com"
        }
        authent.login()

        def upload = project.task("uploadMultiDebugToPandaLab", type: UploadApk) {
            appName = "passport"
            versionUID = "multi-2.1.0-SNAPSHOT-66-1564672173491"
            buildType = "debug"
            flavorName = "multi"
            apkType = "debug"
        }

        def runPandaLabTest = project.task("runPandaLabTest", type: PandaLabTest) {
            variantName = "multiDebug"
            waitForResult = false
            devices = ["aa885792-c5de-4076-a6f8-c28d4c841efb"]
        }


        runPandaLabTest.launchTask()


    }

}
