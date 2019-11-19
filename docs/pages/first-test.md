---
layout: default
title: First test
description: "Create a test with pandalab"
permalink: /create-test
nav_order: 5
---
# Create your first test

The PandaLab gradle plugin helps you create test tasks to run on the lab. 
It is possible to create different gradle tasks to deal with very specific needs.

## Configuration

Add the gradle plugin classpath to the build.gradle file at the root of the project:  

pandalab_version = ![https://bintray.com/mobiletribe/maven/com.leroymerlin.plugins:pandalab-plugin/_latestVersion](https://api.bintray.com/packages/mobiletribe/maven/com.leroymerlin.plugins:pandalab-plugin/images/download.svg)
```groovy
buildscript {
    repositories{
        jcenter()
    }   
    dependencies {
        classpath "com.leroymerlin.pandalab:gradle-plugin:$pandalab_version"
    }
}
```

Then modify the build.gradle file of your application module to configure the PandaLab plugin :

```groovy
apply plugin: 'com.leroymerlin.pandalab'

pandalab {
    serviceAccountFile = file("path/to/your/firebase-adminsdk.json")
    appName = "APP NAME"
    apiUrl = "YOUR FIREBASE REST API URL"
}
```


To know how to recover the file please consult the following link : [firebase documentation](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)

## Write test

### UI tests

Check the [official documentation](https://developer.android.com/training/testing/ui-testing) to build your **Espresso/UI automation** tests. 

### Take screenshot

If you want screenshot in your test report you have to use [Spoon](https://github.com/square/spoon)

```groovy
compile {
    implementation "com.squareup.spoon:spoon-client:1.7.1"
}
```

```java
Spoon.screenshot(activity, "initial_state");
```

## Create a task

`pandalab` extension allows you to define various parameters in order to launch your instrumentation tests on your phone fleet.
You must define the variant name to test, then you can define the devices ids or groups on which the tests must run.

```groovy
pandalab {
    // ...
    tests {
        test1 {
            variantName = "debug" //required
            devices = ["345678765433456", "09876543456789098765"] //default []
            groups = ["pandalab"] //default []
            devicesCount = 1 //default 0
            timeoutInSecond = 1800 //default 3 hours
            waitForResult = false //default true
            enable = true//default true
        }
        test2 {
            variantName = "debug"
            //...
        }
    }
}
```
<div class="code-example" markdown="1">
* **variantName**: name of the variant to retrieve the apk that will be launched for the tests
* **devices**: the identifiers of the devices on which the tests will be run. The identifiers can be found in the web interface.
* **groups**: the name of the device groups on which the tests will be run.
* **devicesCount**: the number of device to use. 0 will use all the selected devices.
* **timeoutInSecond**: timeout in second. The default value is _900 seconds_.
* **waitForResult**: wait for the result on all tests launched. Very useful for fail a CI job. The default value is _true_.
* **enable**: Enable a task. The default value is true.
</div>

The different tests declared in `tests` generate gradle tasks with the name of the test with the suffix `PandaLabTest`.

In the example above, it generates the tasks : `test1PandaLabTest` and `test2PandaLabTest`

### Run one task
To launch the previously created task `test1`, launch the command line : 

```bash
./gradlew app:test1PandaLabTest
```


### Run all tasks

```bash
./gradlew runPandaLabTests
```

### Upload a version

If you just want to upload a new version to the web interface for a latter use, you can run

```bash
./gradlew uploadToPandaLab
```
That way you will be able to create a test from this version directly in the web interface.


