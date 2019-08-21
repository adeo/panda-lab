<template>
    <div id="firebaseui-auth-container"></div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import * as firebase from "firebase";
    import * as firebaseui from 'firebaseui'

    @Component
    export default class Auth extends Vue {
        mounted() {
            let uiConfig = {
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
            let ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
        }
    }
</script>

<style scoped>

</style>
