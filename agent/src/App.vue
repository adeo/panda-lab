<template>
    <div id="app">
        <div id="loading" v-if="loading">
            <div id="loader-container" class="md-layout md-alignment-center">

                <div class="md-layout-item md-size-60">
                    <img src="./assets/images/logo_neg.svg"/>
                    <md-icon class="md-size-5x" id="loader">loop</md-icon>
                </div>

            </div>

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
    @import "./assets/css/theme";

    #loading {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        background: $primary-color;
        max-width: none;

        #loader {
            margin: auto;
            display: block;
            color: white;
            -webkit-animation: spin 2s linear infinite;
            -moz-animation: spin 2s linear infinite;
            animation: spin 2s linear infinite;
        }

        #loader-container {
            height: 100%;

            img {
                max-height: 420px;
            }
        }

    }


</style>
