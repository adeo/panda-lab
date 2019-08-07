<template>
    <div id="job">
        <md-toolbar>
            <md-button class="md-icon-button" @click="$router.back()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'une JobTask</h3>
        </md-toolbar>
    </div>
</template>
<script lang="ts">

    import {Component, Vue} from "vue-property-decorator";
    import "rxjs-compat/add/operator/map";
    import "rxjs-compat/add/operator/mergeMap";
    import "rxjs-compat/add/operator/toArray";
    import {JobTask} from "@/models/jobs";

    @Component
    export default class JobTaskDetail extends Vue {

        private jobTask: JobTask;

        beforeCreate() {
            // this.jobTask = (this.$route.params.jobTask) as JobTask;
            // console.log(this.jobTask);
        }

    }

</script>
<style lang="css" scoped>
    #job .content {
        padding-top: 20px;
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
    }

    #job .content > .md-card {
        width: 40%;
    }

    #job .content > .md-list {
        width: 55%;
    }
</style>
