<template>
    <div id="root">
        <img id="logo" src="../../assets/images/logo_neg.svg"/>
        <h2 id="title" class="">Sign in</h2>
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
    import UserCredential = firebase.auth.UserCredential;

    @Component
    export default class AuthPage extends Vue {

        private authService: FirebaseAuthService;

        constructor() {
            super();
            this.authService = Services.getInstance().authService;
        }

        mounted() {
            this.authService.isConnected()
                .then(async isLogged => {
                    if (isLogged) {
                        console.log("logged, redirect to splash");
                        await this.$router.push({path: '/splash'})
                    } else {
                        console.log("not logged, show ui");
                        this.connectWithFirebaseUI();
                    }
                })
        }


        /**
         * After connection in FirebaseUI, generated agent and signInWithAgentToken
         */
        private async onSignInSuccessWithAuthResult(): Promise<void> {
            try {
                const agentService = Services.getInstance().node.agentService;

                const result = await firebase.functions().httpsCallable('createAgent')({
                    uid: agentService.getAgentUUID(),
                });
                console.log("onSignInSuccessWithAuthResult", result);
                await this.signInWithAgentToken(result.data.token);
            } catch (e) {
                console.error(e);
                this.$router.push({path: '/home'});
            }
        }

        private async signInWithAgentToken(token: string) {
            const agentService = Services.getInstance().node.agentService;

            console.log("token created ", token);
            console.log("agent uuid created ", agentService.getAgentUUID());
            await Services.getInstance().authService.signInWithAgentToken(token, agentService.getAgentUUID()).toPromise();
            console.log("redirect to splash")
            await this.$router.push({path: '/splash'});
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
<style lang="scss" scoped>

    @import "../../assets/css/theme";

    #root {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        background: $primary-color;
    }

    #logo {
        height: 160px;
        margin: auto;
        display: block;
        margin-top: 100px;
    }

    #title {
        color: white;
        margin-top: 100px;
        display: block;
        text-align: center;
    }

</style>
