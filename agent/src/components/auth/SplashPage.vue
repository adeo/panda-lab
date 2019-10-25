<template>
    <div id="splash">
        <div class="center">
            <img class="logo" src="../../assets/images/logo_neg.svg"/>
            <div v-if="state === StateEnum.LOADING">
                <p>Agent is configuring ...</p>
            </div>
            <div v-else>
                <p>Oops, an error occurred</p>
                <md-button class="md-raised md-primary md-white" v-on:click="onRetry">Retry</md-button>
            </div>
            <p class="step">{{ configurationMessage }}</p>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "rxjs";
    import {Services} from "../../services/services.provider";
    import {AgentService} from "../../services/agent.service";
    import {AgentStatus} from "../../services/node/setup.service";

    enum State {
        LOADING, ERROR
    }

    @Component
    export default class SplashPage extends Vue  {

        protected StateEnum = State;
        protected state: State = State.LOADING;
        private subscription?: Subscription;
        private configurationMessage: string = "Loading...";
        private agentService: AgentService;


        constructor(props) {
            super(props);
            this.agentService = Services.getInstance().node.agentService
        }

        mounted(){
            this.subscription = this.agentService.listenAgentStatus()
                .subscribe((status: AgentStatus) => {
                    console.log("agent status", status);
                    switch (status) {
                        case AgentStatus.CONFIGURING:
                            this.configurationMessage = "Loading..";
                            break;
                        case AgentStatus.NOT_LOGGED:
                            this.configurationMessage = "Device lab not logged";
                            console.log("Device lab not logged : redirect to /login")
                            this.$router.push({path : '/login'});
                            break;
                        case AgentStatus.READY:
                            this.configurationMessage = "Device lab ready";
                            console.log("Device lab ready : redirect to /agentDevices")
                            this.$router.push({path : '/agentDevices'});
                            break;
                    }
                    console.log('agent status', this.configurationMessage)

                })
        }

        destroyed() {
            this.cancelSubscription();
        }


        private cancelSubscription() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }

    }
</script>

<style scoped lang="scss">
    @import "../../assets/css/theme";

    #splash {
        position: fixed;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        padding-bottom: 56px;
        background-color: $primary-color;
        color: white;
        font-size: 2em;
        line-height: 1em;
    }

    #splash .step {
        font-size: 0.5em;
    }

    .md-white {
        background: white;
    }

    .center {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    }

    .logo {
        width: 50%;
        height: 50%;
    }
</style>
