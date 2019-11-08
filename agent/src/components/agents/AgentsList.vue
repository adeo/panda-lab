<template>
    <div class="pl-container">
        <div class="md-layout md-alignment-center">
            <h2 class="md-layout-item pl-title">Agents</h2>
            <md-button @click="showDialog = true" id="downloadBtn" class=" md-raised md-primary">
                <md-icon>cloud_download</md-icon>
                <span>Download</span>
            </md-button>
        </div>
        <md-table v-model="agents" md-card>
            <md-table-row slot="md-table-row" slot-scope="{ item }" v-on:click="openAgentDetail(item)">
                <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
                <md-table-cell md-label="Created at" md-sort-by="createdAt">{{
                    formatter.formatDate(item.createdAt.toDate()) }}
                </md-table-cell>
                <md-table-cell md-label="Online" md-sort-by="online">{{ item.online }}</md-table-cell>
            </md-table-row>
        </md-table>


        <md-snackbar :md-duration="4000" :md-active.sync="snackbar.display" md-persistent>
            <span>{{snackbar.msg}}</span>
            <md-button class="md-primary" @click="snackbar.display = false">Ok</md-button>
        </md-snackbar>


        <md-dialog :md-active.sync="showDialog" id="downloadDialog">
            <md-dialog-title>Download agent client</md-dialog-title>
            <md-list>
                <md-list-item v-for="platform in platforms" v-bind:key="platform.file">
                    <md-button @click="downloadClient(platform.file)" class="md-raised md-primary">
                        {{platform.name}}
                    </md-button>
                </md-list-item>
            </md-list>
        </md-dialog>

    </div>
</template>

<script lang="ts">
    import {AgentModel} from 'pandalab-commons'
    import {Component, Vue} from "vue-property-decorator";
    import {getRuntimeEnv, RuntimeEnv, Services} from "../../services/services.provider";
    import {DateFormatter} from "../utils/Formatter";

    @Component
    export default class AgentsList extends Vue {

        agents: AgentModel[] = [];
        private snackbar: any = {
            display: false,
            msg: '',
        };
        protected isElectron: Boolean = getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER;

        platforms = [
            {name: "Windows", file: "windows-agent.exe"},
            {name: "Mac", file: "mac-agent.dmg"},
            {name: "Linux", file: "linux-agent.AppImage"},
        ]
        protected showDialog = false;
        protected formatter = new DateFormatter();

        mounted() {
            this.$subscribeTo(Services.getInstance().agentsService.listenAgents(), agents => {
                this.agents = agents;
            })
        }

        protected openAgentDetail(agent: AgentModel) {
            this.$router.push(`/agents/${agent._ref.id}`);
        }

        downloadClient(version) {
            this.$subscribeTo(Services.getInstance().firebaseRepo.getFileUrl("config/" + version), url => {
                this.showDialog = false;
                if (this.isElectron) {
                    const {clipboard} = require('electron');
                    clipboard.writeText(url);
                    this.snackbar.msg = `URL Copied !`;
                    this.snackbar.display = true;
                } else {
                    window.open(url);
                }
            })
        }


    }
</script>

<style scoped>
    #downloadBtn .md-icon {
        margin-right: 8px;
        margin-top: -4px;
    }

    #downloadDialog button {
        width: 100%;
    }
</style>
