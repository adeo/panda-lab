<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Pie} from 'vue-chartjs'
    import {ChartData, ChartOptions} from "chart.js"

    @Component({
        extends: Pie
    })
    export default class PieChart extends Vue {


        @Prop({required: true}) data: ChartData;

        options: ChartOptions;


        constructor() {
            super();
            this.options = {
                responsive: true
            }
        }

        mounted() {
            const local = (this as any as Pie);
            local.renderChart(this.data, this.options);

            this.$watch("data", () => {
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
