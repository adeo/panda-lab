import {ControlType} from "../../models/stream";
import {AndroidMotionEventAction} from "../../services/node/stream.service";
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
                        <div v-if="video" id="device-btn">
                            <md-button @mousedown="pressMenu" @mouseup="pressMenu"
                                       class="md-icon-button">
                                <md-icon>menu</md-icon>
                            </md-button>
                            <md-button @mousedown="pressHome" @mouseup="pressHome"
                                       class="md-icon-button">
                                <md-icon>home</md-icon>
                            </md-button>
                            <md-button @mousedown="pressBack" @mouseup="pressBack"
                                       class="md-icon-button">
                                <md-icon>arrow_back</md-icon>
                            </md-button>
                        </div>
                        <div class="md-layout-item" ref="video-box" id="media-box">
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
    import {
        AndroidKeycode,
        AndroidMotionEventAction,
        AndroidMotionEventButtons,
        ControlMsg,
        ControlType
    } from "../../models/stream";

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


        destroyed() {
            if (this.wsavc) {
                console.log("close steam");
                this.wsavc.disconnect();
            }
        }

        pressMenu(mouseEvent: MouseEvent) {
            this.pressKey(AndroidKeycode.AKEYCODE_APP_SWITCH, mouseEvent.buttons > 0)
        }

        pressBack(mouseEvent: MouseEvent) {
            this.pressKey(AndroidKeycode.AKEYCODE_BACK, mouseEvent.buttons > 0)
        }

        pressHome(mouseEvent: MouseEvent) {
            this.pressKey(AndroidKeycode.AKEYCODE_HOME, mouseEvent.buttons > 0)
        }

        pressKey(key: number, down: boolean) {
            const msg = {
                type: ControlType.CONTROL_MSG_TYPE_INJECT_KEYCODE,
                keycode: key,
                metaState: 0,
                action: down ? AndroidMotionEventAction.AMOTION_EVENT_ACTION_DOWN : AndroidMotionEventAction.AMOTION_EVENT_ACTION_UP
            } as ControlMsg;
            this.sendControl(msg)
        }

        protected startVideo(url) {

            this.wsavc = new WSAvcPlayer.default({
                useWorker: true,
                workerFile: "/scripts/Decoder.js",
            });
            let canvas = this.wsavc.AvcPlayer.canvas;

            canvas.addEventListener("mousedown", e => {
                this.sendMouseEvent(canvas, e, AndroidMotionEventAction.AMOTION_EVENT_ACTION_DOWN)
            }, false);
            canvas.addEventListener("mouseup", e => {
                this.sendMouseEvent(canvas, e, AndroidMotionEventAction.AMOTION_EVENT_ACTION_UP)
            }, false);
            canvas.addEventListener("mousemove", e => {
                this.sendMouseEvent(canvas, e, AndroidMotionEventAction.AMOTION_EVENT_ACTION_MOVE)
            }, false);

            canvas.id = "stream";
            canvas.ref = "stream";
            canvas.style.background = "white";
            const uri = "ws://" + url;
            this.wsavc.connect(uri);

            this.wsavc.on('disconnected', () => {
                console.log('WS Disconnected');
                canvas.remove();
                this.video = false;
                window.removeEventListener("keypress", this.keyDown, false);
                window.removeEventListener("onpaste", this.onPaste, false);
                window.removeEventListener("oncut", this.onPaste, false);
                window.removeEventListener("paste", this.onPaste, false);
            });
            this.wsavc.on('connected', () => {
                console.log('WS connected');
                (this.$refs['video-box'] as Element).appendChild(canvas);
                this.wsavc.send('stream', this.$route.params.deviceId);
                this.video = true;
                window.addEventListener("keypress", this.keyDown, false);
                window.addEventListener("onpaste", this.onPaste, false);
                window.addEventListener("oncut", this.onPaste, false);
                window.addEventListener("paste", this.onPaste, false);

            });

            this.wsavc.on('resized', (payload) => {
                console.log('resized', payload)
            });
            this.wsavc.on('stream_active', active => {
                console.log('Stream is ', active ? 'active' : 'offline');
                if (!active) {
                    this.wsavc.disconnect()
                }
            })


        }

        private async onPaste(event) {
            const text = await navigator.clipboard.readText();
            this.sendControl({
                type: ControlType.CONTROL_MSG_TYPE_INJECT_TEXT,
                text: text,
            } as ControlMsg);
            return false;
        }

        private keyDown(event: KeyboardEvent) {
            if (event.keyCode == 13) {
                this.pressKey(AndroidKeycode.AKEYCODE_ENTER, true);
                this.pressKey(AndroidKeycode.AKEYCODE_ENTER, false);
                event.preventDefault();
            } else if (event.key.length == 1) {
                this.sendControl({
                    type: ControlType.CONTROL_MSG_TYPE_INJECT_TEXT,
                    text: event.key,
                } as ControlMsg);
                event.preventDefault();
            }

        }


        protected onBack() {
            this.$router.back();
        }

        private sendMouseEvent(canvas, mouseEvent: MouseEvent, action: AndroidMotionEventAction) {
            if (mouseEvent.buttons > 0 || action == AndroidMotionEventAction.AMOTION_EVENT_ACTION_UP) {
                const rect = canvas.getBoundingClientRect();
                let x = mouseEvent.clientX - rect.left;
                let y = mouseEvent.clientY - rect.top;
                const event = {
                    pointerId: 1,
                    pressure: 0,
                    type: ControlType.CONTROL_MSG_TYPE_INJECT_MOUSE_EVENT,
                    action: action,
                    buttons: AndroidMotionEventButtons.AMOTION_EVENT_BUTTON_PRIMARY,
                    position: {
                        point: {
                            x: x * canvas.width / rect.width,
                            y: y * canvas.height / rect.height,
                        },
                        screenSize: {
                            width: canvas.width,
                            height: canvas.height,
                        }
                    },
                } as ControlMsg;

                this.sendControl(event);
            }
        }

        private sendControl(event: ControlMsg) {
            event.deviceId = this.device._ref.id;
            this.wsavc.send('control', JSON.stringify(event));
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

        #device-btn button {
            display: block;
            margin: auto;
        }
    }
</style>
