<template>
    <div>
        <md-card>
            <md-card-header>
                <md-card-header-text>
                    <div class="md-title">{{ app.name }}</div>
                </md-card-header-text>


                <md-card-media>

                    <!--                    <img src="/assets/examples/avatar-2.jpg" alt="People">-->
                </md-card-media>

            </md-card-header>


        </md-card>


    </div>


</template>
<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {AgentDeviceData} from "../../services/agent.service";

    @Component
    export default class AppCell extends Vue {

        @Prop({required: true}) app: AgentDeviceData;


        mounted() {


            //this.$subscribeTo(Services.getInstance().jobsService.)

        }


    }

</script>
<style lang="css" scoped>

</style>
