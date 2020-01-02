# Panda Lab

!["Apache License 2", link="http://www.apache.org/licenses/LICENSE-2.0.txt"](http://img.shields.io/badge/license-ASF2-blue.svg)

PandaLab is an open source solution which helps you to manager fleet of devices and to run automatic tests on them.


## [Documentation](https://adeo.github.io/panda-lab/)

To use PandaLab please check the [documentation](https://adeo.github.io/panda-lab/)

## Developer commands

|Command|Description|
|--|--|
|`npm install`| install all submodule dependencies |
|`npm run build`| build submodule artifacts |
|`npm run deploy`| deploy PandaLab on firebase and upload clients |

### Commons
`/commons` folder contains shared code between  web and agent interface and the firebase functions code.

### Functions

`/functions` folder contains the code for the web and agent interface.

|Command|Description|
|--|--|
|`npm run deploy`| deploy function to firebase |

### Agent

`/agent` folder contains the code for the web and agent interface.

|Command|Description|
|--|--|
|`npm run serve`| start the web interface in livereload mode |
|`npm run electron:serve`| start the electron agent in livereload mode |

### Android

`/android` folder contains the code of the Android client app.


### Gradle plugin 

`/plugins/gradle-plugin` folder contains the plugin source code

Plugin is built by PandaLab team and is available on jcenter()
![https://bintray.com/mobiletribe/maven/com.leroymerlin.plugins:pandalab-plugin/_latestVersion](https://api.bintray.com/packages/mobiletribe/maven/com.leroymerlin.plugins:pandalab-plugin/images/download.svg)

```groovy
buildscript {
    repositories{
        jcenter()
    }   
    dependencies {
        classpath "com.leroymerlin.pandalab:gradle-plugin:$pandalab_version"
    }
}
apply plugin: 'com.leroymerlin.pandalab'
```

## License

PandaLab is distributed by an [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

## Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.
Read more about becoming a contributor in [this guide](https://www.contributor-covenant.org/).
