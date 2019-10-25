<script lang="ts">

    import {Component, Mixins, Prop, Watch} from "vue-property-decorator";
    import {Line} from 'vue-chartjs'
    import {ChartData, ChartDataSets, ChartOptions} from "chart.js"
    import {TestReport} from "pandalab-commons";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class TestReportLineChart extends Mixins<Line>(Line) {

        @Prop({required: true})
        reports: TestReport[];

        @Prop({default: true})
        legend: boolean;

        protected formatter = new DateFormatter();

        @Watch("reports") onReportChange(values: TestReport[]) {
            const data = this.convertToChartData(values);
            this.renderChart(data, this.options);
        }

        options: ChartOptions;


        constructor() {
            super();


        }

        mounted() {
            this.options = {
                maintainAspectRatio: false,
                responsive: true,
                layout: {
                    padding: {
                        left: 5,
                        right: 5,
                        top: 5,
                        bottom: 5
                    }
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title(item: Chart.ChartTooltipItem[], data: Chart.ChartData): string | string[] {
                            return data.labels[item[0].index];
                        }
                    }
                },
                legend:{
                    display: this.legend,
                },
                hover: {
                    mode: 'nearest',
                    intersect: false,
                },
                onClick: (event1, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = (activeElements[0] as any)._index;
                        this.emitIndex(index)
                    }
                },
                scales: {
                    xAxes: [{
                        ticks: {
                            display: this.legend,
                            callback(value: string, index: any, values: any): string | number {
                                return value.split("\n")[1];
                            }
                        }
                    }],
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            display: this.legend,
                        },
                    }]
                }
            }
        }

        private convertToChartData(reports: TestReport[]): ChartData {
            const successData: ChartDataSets = {
                data: [],
                backgroundColor: 'rgb(62,125,62)',
                borderColor: '#5dc050',
                label: "Success"
            };
            const unstableData: ChartDataSets = {
                data: [],
                backgroundColor: 'rgb(161,72,10)',
                borderColor: '#EC870A',
                label: "Unstable"
            };
            const failureData: ChartDataSets = {
                data: [],
                backgroundColor: 'rgb(142,28,14)',
                borderColor: '#D12311',
                label: "Error"
            };

            const chartData: ChartData = {labels: [], datasets: [successData, unstableData, failureData]};


            reports.forEach(report => {
                let date = this.formatter.formatDate(report.date.toDate());
                chartData.labels.push(date + "\n" + report.versionName);
                successData.data.push(report.testSuccess);
                unstableData.data.push(report.testUnstable);
                failureData.data.push(report.testFailure);
            });
            return chartData;
        }

        emitIndex(index: number) {
            this.$emit("index", index)
        }

        // protected formatDate(date) {
        //     const hours = date.getHours();
        //     let minutes = date.getMinutes();
        //     minutes = minutes < 10 ? '0' + minutes : minutes;
        //     const strTime = hours + ':' + minutes;
        //     let month = (date.getMonth() + 1)
        //     month = month < 10 ? '0' + month : month;
        //     return date.getDate() + "/" + month + "/" + date.getFullYear() + " " + strTime;
        // }


    }

</script>
<style lang="css" scoped>
</style>
