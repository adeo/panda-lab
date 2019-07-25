<template>
    <div class="hello">
        <h1>Home</h1>
    </div>
    <div class="devices-card-container">
        <div *ngFor="let device of devices$ | async" class="devices-grid">
            <md-card md-with-hover class="devices-card">
                <md-card-header>
                    <div class="md-title">{{ device.phoneModel }}</div>
                </md-card-header>

                <md-card-media md-big>
                    <img :src="(device.pictureIcon || 'assets/images/device.png')">
                </md-card-media>

                <md-card-content>
                    <div class="card-text-content">
                        {{ device.name }}
                    </div>
                </md-card-content>
            </md-card>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator';

    @Component
    export default class Website extends Vue {
        @Prop() private msg!: string;
    }
</script>

<style scoped>
    .devices-card-container {
        margin: 15px;
        position: relative;
        overflow: auto;
    }
    .devices-card {
        width: 300px;
        float: left;
        margin: 5px;
    }
</style>
