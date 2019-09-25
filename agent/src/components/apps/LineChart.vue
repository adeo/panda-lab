<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Line} from 'vue-chartjs'
    import {ChartData, ChartOptions} from "chart.js"

    @Component({
        extends: Line
    })
    export default class LineChart extends Vue {


        @Prop({required: true}) data: ChartData;

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
            const local = (this as any as Line);
            local.renderChart(this.data, this.options);

            this.$watch("data", n => {
                local.renderChart(this.data, this.options);
            })


        }

        emitIndex(index: number) {
            this.$emit("index", index)
        }


    }

</script>
<style lang="css" scoped>
</style>
