<template>
    <div id="auth">
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
        <div id="firebaseui-auth-container"></div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "rxjs";
    import * as firebase from "firebase";
    import * as firebaseui from 'firebaseui'
    import {ConfigurationService} from "../../services/agent.repository";

    enum State {
        LOADING, ERROR
    }

    @Component
    export default class Auth extends Vue {

        private readonly configurationService = new ConfigurationService();
        protected StateEnum = State;
        protected state: State = State.LOADING;
        private subscription?: Subscription;
        private configurationMessage: string = "Loading...";

        mounted() {
            console.log(authentService);
            console.log(firebase.auth().currentUser);
            if(authentService.isConnected) {
                this.configure();
            } else {
                let uiConfig = {
                    callbacks: {
                        signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                            // User successfully signed in.
                            // Return type determines whether we continue the redirect automatically
                            // or whether we leave that to developer to handle.
                            console.log("Success logged");
                            console.log(firebase.auth().currentUser);
                            console.log(authResult);
                            return true;
                        },
                        uiShown: function() {
                            // The widget is rendered.
                            // Hide the loader.

                        }
                    },
                    signInSuccessUrl: '/',
                    signInOptions: [
                        {
                            provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                            authMethod: 'https://accounts.google.com',
                            clientId: '24857120470-lpj1m345qh0spg0jjfr379dumpf7r96j.apps.googleusercontent.com'
                        },
                        firebase.auth.EmailAuthProvider.PROVIDER_ID
                    ]
                };
                let ui = new firebaseui.auth.AuthUI(firebase.auth());
                ui.start('#firebaseui-auth-container', uiConfig);
            }
        }

        destroyed() {
            this.cancelSubscription();
        }

        protected onRetry() {
            this.configure();
        }

        private cancelSubscription() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }

        private configure() {
            this.cancelSubscription();
            this.state = State.LOADING;
            this.subscription = this.configurationService.configure().subscribe(
                msg => {
                    console.log(msg);
                    this.configurationMessage = msg;
                    this.$forceUpdate();
                }, error => {
                    this.state = State.ERROR;
                    console.error(`App createAgentToken() error`, error);
                }, () => {
                    this.$router.replace('/home');
                    console.log(`App createAgentToken() finish()`);
                }
            );
        }
    }

</script>
<style>
    #auth {
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

    #auth .step {
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
