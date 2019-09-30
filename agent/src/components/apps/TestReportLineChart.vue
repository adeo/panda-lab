<script lang="ts">

    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import {Line} from 'vue-chartjs'
    import {ChartData, ChartDataSets, ChartOptions} from "chart.js"
    import {TestReport} from "pandalab-commons";

    @Component({
        extends: Line
    })
    export default class TestReportLineChart extends Vue {

        @Prop({required: true})
        reports: TestReport[];

        @Watch("reports") onReportChange(values: TestReport[]) {
            const data = this.convertToChartData(values);
            const local = (this as any as Line);
            local.renderChart(data, this.options);
        }

        options: ChartOptions;


        constructor() {
            super();
            this.options = {
                responsive: true,
                tooltips: {
                    mode: 'index',
                    intersect: false,
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
                    yAxes: [{
                        stacked: true,
                    }]
                }
            }
        }

        mounted() {

        }

        private convertToChartData(reports: TestReport[]): ChartData {
            const successData: ChartDataSets = {
                data: [],
                backgroundColor: '#5dc050',
                borderColor: '#5dc050',
                label: "Success"
            };
            const unstableData: ChartDataSets = {
                data: [],
                backgroundColor: '#EC870A',
                borderColor: '#EC870A',
                label: "Unstable"
            };
            const failureData: ChartDataSets = {
                data: [],
                backgroundColor: '#D12311',
                borderColor: '#D12311',
                label: "Error"
            };

            const chartData: ChartData = {labels: [], datasets: [successData, unstableData, failureData]};

            reports.forEach(report => {
                let date = this.formatDate(report.date.toDate());
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

        protected formatDate(date) {
            const hours = date.getHours();
            let minutes = date.getMinutes();
            minutes = minutes < 10 ? '0' + minutes : minutes;
            const strTime = hours + ':' + minutes;
            let month = (date.getMonth() + 1)
            month = month < 10 ? '0' + month : month;
            return date.getDate() + "/" + month + "/" + date.getFullYear() + " " + strTime;
        }


    }

</script>
<style lang="css" scoped>
</style>
