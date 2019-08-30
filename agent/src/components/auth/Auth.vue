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
    import {router} from "../../routers/router";
    import UserCredential = firebase.auth.UserCredential;

    @Component
    export default class Auth extends Vue {


        constructor() {
            super();

            // const services = LocalServicesProvider.newInstance({
            //     apiKey: process.env.VUE_APP_API_KEY,
            //     authDomain: process.env.VUE_APP_AUTH_DOMAIN,
            //     projectId: process.env.VUE_APP_PROJECT_ID,
            //     databaseURL: process.env.VUE_APP_DATABASE_URL,
            //     messagingSenderId: process.env.VUE_APP_MESSAGING_SENDER_ID,
            //     storageBucket: process.env.VUE_APP_STORAGE_BUCKET,
            //     apiURL: process.env.VUE_APP_API_URL
            // })
            //
            // this.firebaseAuth = services.authService.auth;

        }

        mounted() {
            console.log("mounted")

            let uiConfig = {
                callbacks: {
                    signInSuccessWithAuthResult: function (authResult: UserCredential, redirectUrl) {
                        console.log("user logged");
                        if (getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER) {
                            const agentService = Services.getInstance().agentService;
                            firebase.functions().httpsCallable('createAgent')({
                                uid: agentService.getAgentUUID(),
                            }).then((result) => {
                                let token = result.data.token;
                                console.log("token created", token);
                                return Services.getInstance().authService.signInWithAgentToken(token, agentService.getAgentUUID())
                            })
                                .then(value => {
                                    console.log('agent logged');
                                    return router.push({path: '/splach'})
                                })
                                .catch(error => {
                                    console.error("error", error);
                                    return router.push({path: '/'})
                                });
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
            let ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
        }
    }

</script>
<style>

</style>
