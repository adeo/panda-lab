<template>

    <md-table v-model="agents" md-card>
        <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="openAgentDetail(item)">
            <md-table-cell md-label="ID" md-numeric> {{ item._ref.id }}</md-table-cell>
            <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
            <md-table-cell md-label="Created at" md-sort-by="createdAt">{{ formatter.formatDate(item.createdAt.toDate()) }}</md-table-cell>
            <md-table-cell md-label="Online" md-sort-by="online">{{ item.online }}</md-table-cell>
        </md-table-row>
    </md-table>

</template>

<script lang="ts">
    import {AgentModel} from 'pandalab-commons'
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class AgentsList extends Vue {

        agents: AgentModel[] = [];

        protected formatter = new DateFormatter();

        mounted() {
            this.$subscribeTo(Services.getInstance().agentsService.listenAgents(), agents => {
                this.agents = agents;
            })
        }

        protected openAgentDetail(agent: AgentModel) {
            //TODO
        }


    }
</script>

<style scoped>

</style>
