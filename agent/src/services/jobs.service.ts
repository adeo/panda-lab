import {
    Artifact,
    CollectionName,
    Device,
    Job,
    JobRequest,
    JobTask,
    LogsModel,
    TestModel,
    TestReport,
    TestResult,
    TestStatus
} from 'pandalab-commons';
import {FirebaseRepository} from "./repositories/firebase.repository";
import '@firebase/auth';
import '@firebase/firestore';
import {from, Observable, of} from "rxjs";
import {filter, flatMap, map, tap, toArray} from "rxjs/operators";
import HttpsCallableResult = firebase.functions.HttpsCallableResult;

export class JobsService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    public getArtifacts(applicationId: string, versionId: string): Observable<Artifact[]> {
        const query = this.firebaseRepo.getCollection(CollectionName.APPLICATIONS)
            .doc(applicationId)
            .collection(CollectionName.VERSIONS)
            .doc(versionId)
            .collection(CollectionName.ARTIFACTS);

        return this.firebaseRepo.getQuery<Artifact>(query)
            .pipe(
                flatMap(from),
                filter((artifact: Artifact) => artifact.type !== 'test'),
                toArray(),
                tap((r) => console.log(`getArtifacts = ${r}`))
            );
    }

    public getArtifactsExcludeRelease(applicationId: string, versionId: string): Observable<Artifact[]> {
        return this.getArtifacts(applicationId, versionId).pipe(
            flatMap(from),
            filter((artifact: Artifact) => artifact.type !== 'release'),
            toArray(),
        );
    }

    public listenJob(id: string) :  Observable<Job>{
        return this.firebaseRepo.listenDocumentRef<Job>(this.firebaseRepo.getCollection(CollectionName.JOBS).doc(id))
    }

    public listenJobs() :  Observable<Job[]>{
        const query = this.firebaseRepo.getCollection(CollectionName.JOBS);
        return this.firebaseRepo.listenQuery<Job>(query);
    }

    public getJob(id: string): Observable<Job> {
        return this.firebaseRepo.getDocument<Job>(this.firebaseRepo.getCollection(CollectionName.JOBS).doc(id))
    }

    public getJobs(application: any, version: any): Observable<Job[]> {
        return this.getArtifacts(application, version)
            .pipe(
                flatMap(from),
                map((artifact: Artifact) => artifact._ref),
                flatMap(ref => {
                    return this.firebaseRepo.getQuery(this.firebaseRepo.getCollection(CollectionName.JOBS)
                        .where('apk', '==', ref))
                        .pipe(
                            flatMap(from)
                        )
                }),
                toArray()
            );
    }

    public listenJobTasks(jobId: string): Observable<JobTask[]> {
        return this.firebaseRepo.listenQuery<JobTask>(this.getJobTasksQuery(jobId))
    }


    public getJobTasks(jobId: string): Observable<JobTask[]> {
        return this.firebaseRepo.getQuery<JobTask>(this.getJobTasksQuery(jobId))
    }

    private getJobTasksQuery(jobId: string) {
        const jobReference = this.firebaseRepo.getCollection(CollectionName.JOBS).doc(jobId);
        return this.firebaseRepo.getCollection(CollectionName.TASKS)
            .where('job', '==', jobReference);
    }

    public getJobTask(taskId: string): Observable<JobTask> {
        return this.firebaseRepo.getDocument<JobTask>(this.firebaseRepo.getCollection(CollectionName.TASKS).doc(taskId))
    }


    public getDeviceJob(deviceUid: string): Observable<JobTask[]> {
        return this.firebaseRepo.getQuery<JobTask>(this.firebaseRepo.getCollection(CollectionName.TASKS)
            .where('device', '==', this.firebaseRepo.getCollection(CollectionName.DEVICES).doc(deviceUid))
            .orderBy('createdAt', "desc"))
    }

    public getAllJobs(): Observable<Job[]> {
        return this.firebaseRepo.getQuery<Job>(
            this.firebaseRepo.getCollection(CollectionName.JOBS).orderBy('createdAt', 'desc')
        );
    }

    public createNewJob(artifact: Artifact, devices: string[], groups: string[], timeout: number, devicesCount: number = 0): Observable<string> {
        return of(artifact)
            .pipe(
                flatMap(artifact => {
                    console.log(artifact.path);
                    const promise = this.firebaseRepo.firebase.functions().httpsCallable('createJob')(<JobRequest>{
                        artifact: artifact._ref.path,
                        devices: devices,
                        groups: groups,
                        devicesCount: devicesCount,
                        timeoutInSecond: timeout
                    });
                    return from(promise);
                }),
                map((result: HttpsCallableResult) => {
                    return result.data.jobId;
                }),
            );
    }

    listenAppReports(appId: string): Observable<TestReport[]> {
        return this.firebaseRepo.listenQuery<TestReport>(this.firebaseRepo.getCollection(CollectionName.JOB_REPORTS)
            .orderBy("date", "asc")
            .where('app', '==', this.firebaseRepo.getCollection(CollectionName.APPLICATIONS).doc(appId)))
    }

    listenVersionReports(appId: string, versionId): Observable<TestReport[]> {
        return this.firebaseRepo.getQuery<TestReport>(this.firebaseRepo.getCollection(CollectionName.JOB_REPORTS)
            .orderBy("date", "asc")
            .where('version', '==', this.firebaseRepo.getCollection(CollectionName.APPLICATIONS).doc(appId).collection(CollectionName.VERSIONS).doc(versionId)));
    }


    getReport(jobId: string): Observable<TestReport> {
        return this.firebaseRepo.getDocument(this.firebaseRepo.getCollection(CollectionName.JOB_REPORTS).doc(jobId));
    }

    getTaskReports(jobId: string): Observable<TestReportModel[]> {
        return this.firebaseRepo.getQuery<TestModel>(this.firebaseRepo.getCollection(CollectionName.TASK_REPORTS)
            .where("job", '==', this.firebaseRepo.getCollection(CollectionName.JOBS).doc(jobId)))
            .pipe(
                flatMap(values => {
                    return from(values)
                        .pipe(
                            flatMap(value => this.firebaseRepo.getDocument<Device>(value.device as any)
                                .pipe(
                                    map(device => {
                                        value.device = device as any;
                                        return value;
                                    }))
                            ),
                            toArray(),
                        )
                }),
                map(values => {
                    const resultMap = new Map<string, TestReportModel>();

                    values.forEach((testModel: TestModel) => {
                        testModel.tests.forEach(testResult => {
                            if (!resultMap.has(testResult.id)) {
                                resultMap.set(testResult.id, {id: testResult.id, tests: [], status: "success"})
                            }
                            const report = resultMap.get(testResult.id);
                            report.tests.push({result: testResult, device: testModel.device as any})
                        })
                    });

                    let testReportModels = Array.from(resultMap.values());
                    testReportModels.forEach(value => {
                        const successCount = value.tests.filter(test => test.result.status === TestStatus.pass).length;
                        if (successCount === value.tests.length) {
                            value.status = "success"
                        } else if (successCount == 0) {
                            value.status = "error"
                        } else {
                            value.status = "unstable"
                        }
                    });
                    return testReportModels
                })
            );
    }

    public getReportLogs(report: TestResult): Observable<LogsModel> {
        return this.firebaseRepo.getDocument<LogsModel>(report.logs as any);
    }

    public getImagesUrl(imgPaths: string[]): Observable<string[]> {
        return from(imgPaths)
            .pipe(
                flatMap(img => this.firebaseRepo.getFileUrl(img)),
                toArray(),
            )
    }
}


export interface TestReportModel {
    id: string,
    status: "success" | "unstable" | "error",
    tests: { result: TestResult, device: Device }[]
}
