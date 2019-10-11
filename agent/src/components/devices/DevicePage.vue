<template xmlns:v-init="http://www.w3.org/1999/xhtml">
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="$router.back()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Device
                </h2>
            </div>
            <template v-if="device">
                <div class="content">
                    <div class="md-layout">
                        <div class="md-card md-layout-item">
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
                                    <md-icon :class="'device-' + device.status">update</md-icon>
                                    <div class="md-list-item-text">
                                        <span :class="'device-' + device.status">{{device.status}}</span>
                                    </div>
                                </md-list-item>
                            </md-list>
                        </div>
                        <div class="md-layout-item md-layout">
                            <img v-bind:click="video = true"
                                 :src="device.pictureIcon ? device.pictureIcon : require('../../assets/images/device.png')"
                                 alt="toto"/>
                        </div>
                    </div>
                    <ListTasks :tasks="tasks"></ListTasks>
                </div>
            </template>
            <template v-else>
                <p>LOADING...</p>
            </template>
        </div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {Services} from "../../services/services.provider";
    import {Device, JobTask} from "pandalab-commons";
    import {DateFormatter} from "../utils/Formatter";
    import ListTasks from "../widget/ListTasks.vue";

    @Component({
        components: {ListTasks}
    })
    export default class DevicePage extends Vue {

        formatter = new DateFormatter();

        video = false;

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

        protected goBack() {
            this.$router.back();
        }

    }

</script>
<style scoped>

    #task-table {
        margin-top: 20px;
    }

    #device .container > * {
        flex: 1;
    }

</style>
