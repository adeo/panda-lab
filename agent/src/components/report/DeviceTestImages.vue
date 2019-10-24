<template>
    <div class="container">
        <h2>{{name}}</h2>
        <div class="line">
            <div class="image" v-for="imageUrl in imageUrls" :key="imageUrl">
                <img class="screenshot" :src="imageUrl" alt="screenshot"/>
            </div>
        </div>
    </div>
</template>
<script lang="ts">

    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";

    @Component
    export default class DeviceTestImages extends Vue {

        @Prop({required: true}) name: string;
        @Prop({required: true}) images: string[];

        imageUrls: string[] = [];

        mounted() {

            this.$subscribeTo(Services.getInstance().jobsService.getImagesUrl(this.images), urls => {
                this.imageUrls = urls;
            });
        }

    }

</script>
<style scoped lang="scss">

    @import "../../assets/css/theme";


    .screenshot {
        height: auto;
        width: 200px;
        margin: 5px;
    }

    .container {
        white-space: nowrap;
        padding: 16px;
    }

    .image {
        display: inline-block;
    }
</style>

