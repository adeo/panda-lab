<template>
    <div id="app">
        <router-view></router-view>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {router} from "@/routers/router";
    import Splash from "@/components/splash/Splash.vue";

    @Component({
        components: {Splash},
        router,
    })
    export default class App extends Vue {

    }
</script>
<style>
    .md-card {
        background: white;
        color: rgba(0, 0, 0, 0.74);
    }
</style>
