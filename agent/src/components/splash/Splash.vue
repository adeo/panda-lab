<template>
    <div id="splash">
        <div class="center">
            <img class="logo" src="https://www.brandcrowd.com/gallery/brands/pictures/picture1470952529624.png"/>
            <div v-if="state === StateEnum.LOADING">
                <p>Création du token en cours ...</p>
            </div>
            <div v-else-if="state === StateEnum.SUCCESS">
                <p>Bravo! La configuration s'est effectuée avec succès.</p>
                <md-button class="md-raised md-primary md-white" v-on:click="onNext()">Suivant</md-button>
            </div>
            <div v-else>
                <p>Une erreur est survenue</p>
                <md-button class="md-raised md-primary md-white" v-on:click="onRetry">Ré-essayer</md-button>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "rxjs";
    import {firebaseService} from "@/services/firebase.service";
    import {Workspace} from "@/node/workspace";
    import {JobSchedulers} from "@/node/job-schedulers";

    enum State {
        LOADING, SUCCESS, ERROR
    }

    @Component
    export default class Splash extends Vue {

        protected StateEnum = State;
        protected state: State = State.LOADING;
        private subscription?: Subscription;

        async mounted() {
            this.createAgentToken();
        }

        destroyed() {
            this.cancelSubscription();
        }

        protected onRetry() {
            this.createAgentToken();
        }

        protected onNext() {
            this.$router.replace('/home');
        }

        private cancelSubscription() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }

        private createAgentToken() {
            console.log(`App createAgentToken()`);
            if (firebaseService.isConnected) {
                this.onNext();
                return;
            }

            this.cancelSubscription();
            this.state = State.LOADING;
            this.subscription = firebaseService.createAgentToken().subscribe(
                token => {
                    this.state = State.SUCCESS;
                    console.log(`App createAgentToken() success, token = ${token}`);
                }, error => {
                    this.state = State.ERROR;
                    console.error(`App createAgentToken() error`, error);
                }, () => {
                    console.log(`App createAgentToken() finish()`);
                }
            );
        }

    }

</script>
<style>
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
        filter: invert(100%) ;
    }
</style>
