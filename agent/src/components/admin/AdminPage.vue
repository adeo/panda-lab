<template>
    <div class="pl-container">
        <div class="md-layout  md-alignment-center">
            <h2 class="md-layout-item pl-title">Admin</h2>
        </div>
        <md-table id="table" md-card>
            <md-table-toolbar>
                <h1 class="md-title">Users</h1>
            </md-table-toolbar>
            <md-table-row>
                <md-table-head>Email</md-table-head>
                <md-table-head>Role</md-table-head>
            </md-table-row>
            <md-table-row v-for="user in users" v-bind:key="user._ref.id">
                <md-table-cell>{{ user.email }}</md-table-cell>
                <AdminUserCell :roles="roles" :user="user" :onRoleChange="onUserRoleChange"></AdminUserCell>
            </md-table-row>
        </md-table>

        <md-snackbar :md-duration="4000" :md-active.sync="snackbar.display" md-persistent>
            <span>{{snackbar.msg}}</span>
            <md-button class="md-primary" @click="snackbar.display = false">Ok</md-button>
        </md-snackbar>

    </div>


</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {Subscription} from "vue-rx-decorators";
    import {Role, User} from 'pandalab-commons';
    import AdminUserCell from "./AdminUserCell.vue";

    @Component({
        components: {AdminUserCell}
    })
    export default class AdminPage extends Vue {

        private roles: Role[];
        private logger = Services.getInstance().logger;
        private snackbar: any = {
            display: false,
            msg: '',
        };

        mounted() {
            this.roles = Object.values(Role).filter(value => {
                return value != Role.agent && value != Role.mobile_agent
            });
        }

        @Subscription()
        protected users() {
            return Services.getInstance().userService.getUsers();
        }

        protected onUserRoleChange(user: User, role: Role) {
            user.role = role;
            const saveUserAsync = Services.getInstance().firebaseRepo.saveDocument(user);
            this.$subscribeTo(saveUserAsync, () => {
                this.snackbar.msg = `The new role ${role} has been saved to the user ${user.email}`;
                this.snackbar.display = true;
            }, reason => {
                this.logger.error(reason);
                this.snackbar.msg = `The new role ${role} has not been saved to the user ${user.email}`;
                this.snackbar.display = true;
            });
        }

    }

</script>
<style scoped>


</style>
