<template>
    <div class="pl-container">
        <md-empty-state
                md-icon="security"
                md-label="Waiting authorization"
                md-description="An administrator must authorize your account.">
            <md-button class="md-primary md-raised" @click="reload">Refresh</md-button>
        </md-empty-state>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {Role} from "pandalab-commons";


    @Component
    export default class GuestPage extends Vue {


        constructor(props) {
            super(props);
        }

        mounted() {
            this.$subscribeTo(Services.getInstance().authService.listenUser(), user => {
                if(user && user.uuid != null && user.role != Role.guest) {
                    this.$router.push("/home")
                }
            });
            this.reload();
        }

        protected reload(){
            Services.getInstance().authService.refreshLabUser()
        }

    }
</script>

<style scoped lang="scss">
    @import "../../assets/css/theme";

    .pl-container{
        display: flex;
        position: absolute;
        left: 0;
        right: 0;
    }

</style>
