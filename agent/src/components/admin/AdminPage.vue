<template>
    <div id="admin">
        <h2>Administration</h2>
        <md-table id="table" md-card>
            <md-table-toolbar>
                <h1 class="md-title">Liste des utilisateurs</h1>
            </md-table-toolbar>
            <md-table-row>
                <md-table-head>email</md-table-head>
                <md-table-head>role</md-table-head>
            </md-table-row>
            <md-table-row v-for="user in users" v-bind:key="user._ref.id" v-on:click="onSelect(user)" md-selectable="single" class="md-primary">
                <md-table-cell>{{ user.email }}</md-table-cell>
                <AdminUserCell :user="user"></AdminUserCell>
            </md-table-row>
        </md-table>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Services} from "../../services/services.provider";
    import {Subscription} from "vue-rx-decorators";
    import {Role} from 'pandalab-commons';
    import AdminUserCell from "./AdminUserCell.vue";

    @Component({
        components: {AdminUserCell}
    })
    export default class AdminPage extends Vue {

        private roles: Role[];

        mounted() {
            this.roles = Object.values(Role);
        }

        @Subscription()
        protected get users() {
            return Services.getInstance().userService.users;
        }

    }

</script>

<style scoped>

</style>
