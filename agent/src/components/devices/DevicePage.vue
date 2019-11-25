<template xmlns:v-init="http://www.w3.org/1999/xhtml">
    <div class="md-layout">
        <div class="md-layout-item pl-container">
            <div class="md-layout md-alignment-center-center">
                <div class="md-layout-item-5">
                    <md-button class="md-icon-button" @click="onBack()">
                        <md-icon>arrow_back</md-icon>
                    </md-button>
                </div>
                <h2 class="md-layout-item pl-title">
                    Device
                </h2>
            </div>
            <template v-if="device">
                <div class="content" id="device">
                    <div class="md-layout" id="header">
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
                        <div class="md-layout-item md-layout" ref="video-box" id="media-box">
                            <img v-if="!video"
                                 :src="device.pictureIcon ? device.pictureIcon : require('../../assets/images/device.png')"/>
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
    import {Services} from "../../services/services.provider";
    import {Device, JobTask} from "pandalab-commons";
    import {DateFormatter} from "../utils/Formatter";
    import ListTasks from "../widget/ListTasks.vue";
    import * as WSAvcPlayer from 'ws-avc-player/lib/WSAvcPlayer'

    @Component({
        components: {ListTasks}
    })
    export default class DevicePage extends Vue {

        formatter = new DateFormatter();

        video = false;

        device: Device = null;
        tasks: JobTask[] = [];

        wsavc: WSAvcPlayer;

        mounted() {

            this.$subscribeTo(Services.getInstance().devicesService.listenDevice(this.$route.params.deviceId), device => {
                this.device = device;
                setTimeout(() => {
                    if (device.streamUrl && !this.video) {
                        this.startVideo(device.streamUrl)
                    }
                }, 1000);

            });

            this.$subscribeTo(Services.getInstance().jobsService.getDeviceJob(this.$route.params.deviceId), tasks => {
                this.tasks = tasks;
            });
        }


        destroyed(){
            if(this.wsavc){
                console.log("close steam");
                this.wsavc.disconnect();
            }
        }

        protected startVideo(url) {
            this.video = true;

            this.wsavc = new WSAvcPlayer.default({useWorker: false});
            let canvas = this.wsavc.AvcPlayer.canvas;
            canvas.id = "stream";
            (this.$refs['video-box'] as Element).appendChild(canvas);
            var uri = "ws://" + url;
            this.wsavc.connect(uri);

            this.wsavc.on('disconnected', () => console.log('WS Disconnected'))
            this.wsavc.on('connected', () => {
                console.log('WS connected')
                this.wsavc.send('stream', this.$route.params.deviceId)
            });

            this.wsavc.on('resized', (payload) => {
                console.log('resized', payload)
                //const vb = document.getElementById('video-box')

                //vb.style = `padding-bottom: calc( 100% * ${payload.height} / ${ payload.width })`
            });
            this.wsavc.on('stream_active', active => console.log('Stream is ', active ? 'active' : 'offline'))


        }



        protected onBack() {
            this.$router.back();
        }

    }

</script>
<style lang="scss">

    #device {
        .container > * {
            flex: 1;
        }

        #media-box {
            position: relative;
            display: block;
        }

        #stream, img {
            max-height: 700px;
            margin: auto;
            display: block;
        }

        #header {
            margin-bottom: 20px;
        }
    }
</style>
