package com.leroymerlin.pandalab

import com.android.build.gradle.AppPlugin
import com.leroymerlin.pandalab.tasks.FirebaseAuthentificationTask
import com.leroymerlin.pandalab.tasks.PandaLabTestTask
import com.leroymerlin.pandalab.tasks.UploadApkTask
import org.gradle.api.Project
import org.gradle.internal.impldep.org.apache.http.util.Asserts
import org.gradle.testfixtures.ProjectBuilder
import org.junit.After
import org.junit.Before
import org.junit.Ignore
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
        pandalab.apiUrl = "https://laburl.com?appName=myAppName&token=secureToken"
        project.evaluate()
    }

    @Test
    void testPandalabTest() {
        project.pandalab {
            tests {
                myTestConfig1 {
                    variantName = "debug"
                    waitForResult = true
                    devices = ["aa885792-c5de-4076-a6f8-c28d4c841efb"]
                }
                myTestConfig2 {
                    variantName = "debug"
                    waitForResult = false
                }
                myTestConfig3 {
                    variantName = "debug"
                    enable = false
                }
            }
        }
        project.evaluate()
        Asserts.notNull(project.tasks.withType(PandaLabTestTask).size() == 3, "task not created")


    }



//    @Test
    @Ignore
    void testFirebase() {
        def pandalab = project.extensions.getByType(PandaLabExtension)
        def authent = project.task("testAuthent", type: FirebaseAuthentificationTask) {
            serviceAccountFile = new File("../../.config/firebase-adminsdk.json")
        }
        authent.login()

        def testFile = File.createTempFile("temp", ".apk")
        testFile << "Hello world"    // write to the temp file

        def upload = project.task("testUpload", type: UploadApkTask) {
            apkFile = testFile
            appName = "testapp"
            versionUID = "1.0.0-SNAPSHOT"
            buildType = "debug"
            flavorName = "debug"
            apkType = "test"
        }


        upload.uploadFile()
        testFile.delete()


    }


}
