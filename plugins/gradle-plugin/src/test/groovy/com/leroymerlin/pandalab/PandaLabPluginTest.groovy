package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
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
    void testFirebase(){
        def pandalab = project.extensions.getByType(PandaLabExtension)
        def authent = project.task("testAuthent", type: FirebaseAuthentification){
            serviceAccountFile = new File("../../.config/firebase-adminsdk.json")
            bucketUrl = "panda-lab-lm.appspot.com"
        }
        authent.login()

        def testFile = File.createTempFile("temp", ".apk")
        testFile << "Hello world"    // write to the temp file

        def upload = project.task("testUpload", type: UploadApk){
            apkFile = testFile
            uploadName = "test.apk"
        }


        upload.uploadFile()
        testFile.delete()


    }

}
