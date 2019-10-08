<template>
    <div id="app">
        <div v-if="loading">
            <md-empty-state
                    id="loading"
                    class="md-primary"
                    md-icon="loop"
                    md-label="App is loading"
                    md-description="Please wait your app is loading">
            </md-empty-state>
        </div>
        <router-view v-if="!loading"></router-view>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {router} from "./routers/router";
    import Auth from "./components/auth/Auth.vue";

    @Component({
        components: {Auth},
        router,
    })
    export default class App extends Vue {

        loading = true;

        mounted() {
            router.afterEach(() => {
                this.loading = false
            });
        }

    }
</script>
<style lang="scss">
    #loading {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        background: white;
        max-width: none;

        .md-empty-state-icon {
            -webkit-animation:spin 2s linear infinite;
            -moz-animation:spin 2s linear infinite;
            animation:spin 2s linear infinite;
        }

    }


</style>
