<template>
    <div id="auth">
        <div id="firebaseui-auth-container"></div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {getRuntimeEnv, RuntimeEnv, Services} from "../../services/services.provider";
    import {firebase} from '@firebase/app';
    import '@firebase/functions'
    import '@firebase/auth'
    import * as firebaseui from 'firebaseui'
    import "rxjs-compat/add/operator/mergeMap";
    import {FirebaseAuthService} from "../../services/firebaseauth.service";
    import {AgentService} from "../../services/agent.service";
    import UserCredential = firebase.auth.UserCredential;

    @Component
    export default class Auth extends Vue {

        private authService: FirebaseAuthService;
        private agentService: AgentService;

        constructor() {
            super();
            this.authService = Services.getInstance().authService;
            this.agentService = Services.getInstance().agentService;
        }

        mounted() {
            if (this.authService.hasAgentToken) {
                console.log('Agent token already exist, restore connection. Agent token = ', this.authService.agentToken);
                this.signInWithAgentToken(this.authService.agentToken)
                    .catch(reason => {
                        console.error('signInWithAgentToken with agent token', reason);
                        this.connectWithFirebaseUI();
                    });
            } else {
                console.log('Agent token not exist, connection with Firebase UI');
                this.connectWithFirebaseUI();
            }
        }

        private async signInWithAgentToken(token: string) {
            console.log("token created ", token);
            console.log("agent uuid created ", this.agentService.getAgentUUID());
            await Services.getInstance().authService.signInWithAgentToken(token, this.agentService.getAgentUUID()).toPromise();
            await this.$router.push({path: '/splash'});
        }

        /**
         * After connection in FirebaseUI, generated agent and signInWithAgentToken
         */
        private async onSignInSuccessWithAuthResult(): Promise<void> {
            try {
                const result = await firebase.functions().httpsCallable('createAgent')({
                    uid: this.agentService.getAgentUUID(),
                });
                console.log("onSignInSuccessWithAuthResult", result);
                await this.signInWithAgentToken(result.data.token);
            } catch (e) {
                console.error(e);
                this.$router.push({path: '/'});
            }
        }

        /**
         * Connection with Custom Email or Gmail address
         */
        private connectWithFirebaseUI() {
            const vue = this;
            let uiConfig = {
                callbacks: {
                    signInSuccessWithAuthResult: function (authResult: UserCredential, redirectUrl) {
                        console.log("user logged");
                        if (getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER) {
                            vue.onSignInSuccessWithAuthResult();
                            return false;
                        } else {
                            return true;
                        }
                    },
                    uiShown: function () {
                        // The widget is rendered.
                        // Hide the loader.
                    }
                },
                signInSuccessUrl: '/home',
                signInOptions: [
                    //TODO externalize conf
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        authMethod: 'https://accounts.google.com',
                        clientId: '24857120470-lpj1m345qh0spg0jjfr379dumpf7r96j.apps.googleusercontent.com'
                    },
                    firebase.auth.EmailAuthProvider.PROVIDER_ID
                ]
            };
            let ui = firebaseui.auth.AuthUI.getInstance() ? firebaseui.auth.AuthUI.getInstance() : new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
        }


    }
</script>
<style>

</style>
