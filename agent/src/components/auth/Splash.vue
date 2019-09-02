<template>
    <div id="splash">
        <div class="center">
            <img class="logo" src="https://www.brandcrowd.com/gallery/brands/pictures/picture1470952529624.png"/>
            <div v-if="state === StateEnum.LOADING">
                <p>Création du token en cours ...</p>
            </div>
            <div v-else>
                <p>Une erreur est survenue</p>
                <md-button class="md-raised md-primary md-white" v-on:click="onRetry">Ré-essayer</md-button>
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
    import {AgentStatus} from "../../services/repositories/agent.repository";
    // import {ConfigurationService} from "../../services/agent.repository";

    enum State {
        LOADING, ERROR
    }

    @Component
    export default class Splash extends Vue  {

        protected StateEnum = State;
        protected state: State = State.LOADING;
        private subscription?: Subscription;
        private configurationMessage: string = "Loading...";
        private agentService: AgentService;


        constructor(props) {
            super(props);
            this.agentService = Services.getInstance().agentService
        }


        mounted(){
            this.subscription = this.agentService.listenAgentStatus()
                .subscribe((status: AgentStatus) => {
                    switch (status) {
                        case AgentStatus.CONFIGURING:
                            this.configurationMessage = "Loading..";
                            this.$router.push({path : '/home'});
                            break;
                        case AgentStatus.NOT_LOGGED:
                            this.configurationMessage = "Device lab not logged";
                            this.$router.push({path : '/'});
                            break;
                        case AgentStatus.READY:
                            this.configurationMessage = "Device lab ready";
                            this.$router.push({path : '/home'});
                            break;
                    }
                    console.log('agent status', this.configurationMessage)

                })
        }

        destroyed() {
            this.cancelSubscription();
        }

        // protected onRetry() {
        //     this.configure();
        // }

        private cancelSubscription() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }

        // private configure() {
        //     this.cancelSubscription();
        //     this.state = State.LOADING;
        //     this.subscription = this.configurationService.configure().subscribe(
        //         msg => {
        //             console.log(msg);
        //             this.configurationMessage = msg;
        //             this.$forceUpdate();
        //         }, error => {
        //             this.state = State.ERROR;
        //             console.error(`App createAgentToken() error`, error);
        //         }, () => {
        //             this.$router.replace('/home');
        //             console.log(`App createAgentToken() finish()`);
        //         }
        //     );
        // }
    }
</script>

<style scoped>
    #splash {
        position: fixed;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        padding-bottom: 56px;
        background-color: #546e7a;
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
        width: 40%;
        height: 40%;
        filter: invert(100%);
    }
</style>
