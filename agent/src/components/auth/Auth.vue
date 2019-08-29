<template>
    <div id="auth">
        <div id="firebaseui-auth-container"></div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {firebase} from '@firebase/app';
    import * as firebaseui from 'firebaseui'

    @Component
    export default class Auth extends Vue {

        private firebaseAuth;

        constructor() {
            super();
            this.firebaseAuth = Services.getInstance().authService.auth;
        }

        mounted() {
            let uiConfig = {
                callbacks: {
                    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                        console.log("Oui");
                        return true;
                    },
                    uiShown: function() {
                        // The widget is rendered.
                        // Hide the loader.
                    }
                },
                signInSuccessUrl: '/splash',
                signInOptions: [
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        authMethod: 'https://accounts.google.com',
                        clientId: '24857120470-lpj1m345qh0spg0jjfr379dumpf7r96j.apps.googleusercontent.com'
                    },
                    firebase.auth.EmailAuthProvider.PROVIDER_ID
                ]
            };

            let ui = new firebaseui.auth.AuthUI(this.firebaseAuth);
            ui.start('#firebaseui-auth-container', uiConfig);
        }
    }

</script>
<style>

</style>
