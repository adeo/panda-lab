<template>
    <div>
        <h2 class="pl-title">Devices</h2>
        <md-list>
            <AgentDevice v-for="device in devices"
                         v-bind:key="device.key"
                         :data="device"></AgentDevice>
        </md-list>
    </div>

</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import {AgentDeviceData} from "../../services/agent.service";
    import AgentDevice from "./AgentDevice.vue";

    @Component({
        components: {AgentDevice}
    })
    export default class AgentDevicesList extends Vue {

        @Prop({required: true}) devices: AgentDeviceData[];

        constructor(props) {
            super(props);
        }

        mounted() {

        }


    }


</script>

<style scoped>

</style>
