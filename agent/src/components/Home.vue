<template>
    <div id="home">
        <div class="content-container">
            <router-view></router-view>
        </div>
        <md-toolbar class="toolbar">
            <div class="md-toolbar-row">
                <img class="toolbar-logo" alt=""
                     src="https://www.brandcrowd.com/gallery/brands/pictures/picture1470952529624.png"/>
                <router-link to="/">
                    <md-button class="md-icon-button toolbar-home-button">
                        <md-icon>home</md-icon>
                    </md-button>
                </router-link>
                <router-link to="/listDevice">
                    <md-button class="md-icon-button toolbar-devices-button">
                        <md-icon>phone_android</md-icon>
                    </md-button>
                </router-link>
                <router-link to="/jobs">
                    <md-button class="md-icon-button toolbar-devices-button">
                        <md-icon>code</md-icon>
                    </md-button>
                </router-link>
            </div>
        </md-toolbar>
    </div>
</template>
<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';

    @Component
    export default class Home extends Vue {

    }

</script>
<style>
    #home {
        display: flex;
        flex-flow: column nowrap;
        justify-content: space-around;
        width: 100%;
        height: 100%;
        position: fixed;
        background-color: #546e7a;
    }
    #home .content-container {
        flex: 1 auto;
        overflow: scroll;
        padding: 12px;
    }

    #home .toolbar {
        background-color: #FFF;
    }

    #home .toolbar-logo {
        width: 55px;
        height: 45px;
    }

    #home .toolbar-home-button {

    }

    #home .toolbar-devices-button {
        margin-left: 20px;
    }

</style>
