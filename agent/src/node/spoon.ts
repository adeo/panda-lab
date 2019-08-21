import {Spoon, SpoonDevice, SpoonResult, SpoonTest, SpoonTestLog} from "../../../commons/src/models/spoon.models";

const fs = require('fs');

export function parseSpoon(path: string) {
    console.log(path);
    const jsonContent = fs.readFileSync(path);
    const json = JSON.parse(jsonContent);
    return <Spoon>{
        title: json.title,
        started: new Date(json.started),
        duration: json.duration,
        results: (() => {
            const keys = Object.keys(json.results);
            const results: SpoonResult[] = [];
            for (let i = 0; i < keys.length; i++) {
                const id = keys[i];
                const value = json.results[id];
                const deviceDetails = value.deviceDetails;
                const spoonResult = <SpoonResult>{
                    id,
                    installFailed: value.installFailed,
                    device: <SpoonDevice>{
                        model: deviceDetails.model,
                        manufacturer: deviceDetails.manufacturer,
                        version: deviceDetails.version,
                        apiLevel: deviceDetails.apiLevel,
                        isEmulator: deviceDetails.isEmulator,
                    },
                    tests: value.testResults.map(test => {
                            const testHeader = test[0];
                            const testValue = test[1];
                            return <SpoonTest>{
                                className: testHeader.className,
                                methodName: testHeader.methodName,
                                status: testValue.status,
                                screenshots: testValue.screenshots,
                                files: testValue.files,
                                logs: testValue.log.map(log => {
                                    const timestamp = log.mTimestamp;
                                    const date = timestamp ? new Date(new Date().getFullYear(), timestamp.mMonth, timestamp.mDay, timestamp.mHour,
                                        timestamp.mMinute, timestamp.mSecond, timestamp.mMilli) : null;
                                    return <SpoonTestLog>{
                                        level: log.mHeader.mLogLevel,
                                        pid: log.mHeader.mPid,
                                        tid: log.mHeader.mTid,
                                        appName: log.mHeader.mAppName,
                                        tag: log.mHeader.mTag,
                                        date: date,
                                        message: log.mMessage,
                                    };
                                }),
                            };
                        },
                    ),
                    started: new Date(value.started),
                };
                results.push(spoonResult);
            }
            return results;
        })(),
    };
}
