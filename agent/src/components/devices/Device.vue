<template>
    <div id="device">
        <md-toolbar>
            <md-button class="md-icon-button" @click="onBack()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'un device</h3>
        </md-toolbar>
        <template v-if="device">
            <div class="content">
                <h1>Détail du device</h1>
                <div class="container">
                    <div class="md-card">
                        <md-list class="md-double-line">
                            <md-subheader>Phone</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">phone</md-icon>
                                <div class="md-list-item-text">
                                    <span>{{ device.name }}</span>
                                    <span>{{ device.id }}</span>
                                    <span>{{ device.phoneBrand }}</span>
                                </div>
                            </md-list-item>

                            <md-divider></md-divider>

                            <md-subheader>Serial</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">email</md-icon>

                                <div class="md-list-item-text">
                                    <span>{{ device.phoneModel }}</span>
                                    <span>{{ device.serialId }}</span>
                                </div>
                            </md-list-item>

                            <md-divider></md-divider>

                            <md-subheader>Status</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">update</md-icon>
                                <div class="md-list-item-text">
                                    <span>{{device.status}}</span>
                                </div>
                            </md-list-item>
                        </md-list>
                    </div>
                    <div>
                        <img :src="device.pictureIcon ? device.pictureIcon : require('../../assets/images/device.png')" alt="toto">
                    </div>
                </div>

                <md-table id="task-table" v-if="tasks" v-model="tasks" md-sort="status" md-sort-order="asc" md-card>
                    <md-table-toolbar>
                        <h1 class="md-title">Tasks</h1>
                    </md-table-toolbar>

                    <md-table-row slot="md-table-row" slot-scope="{ item }">
                        <md-table-cell md-label="ID" md-numeric>{{ item._ref.id }}</md-table-cell>
                        <md-table-cell md-label="Status" md-sort-by="status">{{ item.status }}</md-table-cell>
                        <md-table-cell md-label="Job" md-sort-by="job">{{ item.job.id }}</md-table-cell>
                    </md-table-row>
                </md-table>

            </div>
        </template>
        <template v-else>
            <p>LOADING...</p>
        </template>

    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {Services} from "../../services/services.provider";
    import {JobTask} from "pandalab-commons";

    @Component
    export default class Device extends Vue {

        @Subscription(function () {
            return Services.getInstance().devicesService.listenDevice(this.$route.params.deviceId)
        })
        device: Device;

        @Subscription(function () {
            return Services.getInstance().jobsService.getDeviceJob(this.$route.params.deviceId)
        })
        tasks: JobTask[];

        protected onBack() {
            this.$router.back();
        }

    }

</script>
<style scoped>

    #home .content-container {
        padding: 0;
    }

    #device .content {
        padding: 20px;
    }

    h1 {
        color: white;
    }

    #task-table {
        margin-top: 20px;
    }

    #device .container {
        display: flex;
        justify-content: space-around;
        flex-flow: row wrap;
    }

    #device .container > * {
        flex: 1;
    }

    #device .container .md-card {
        padding: 12px;
    }

    #device .progress-container {
        width: 20px;
        height: 20px;
        display: -webkit-box;
    }

    #device .progress-container .md-progress-spinner {
        width: 20px;
        height: 20px;
    }


</style>
