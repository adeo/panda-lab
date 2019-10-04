<template>
    <md-table-cell>
        <md-field>
            <md-select :value="user.role" name="role" id="role" placeholder="role" v-on:md-selected="onSelect">
                <md-option v-for="role in roles" v-bind:key="role" v-bind:value="role">{{ role }}</md-option>
            </md-select>
        </md-field>
    </md-table-cell>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator";
    import {Role, User} from "pandalab-commons";
    import {Services} from "../../services/services.provider";

    @Component
    export default class AdminUserCell extends Vue {

        private roles: Role[] = Object.values(Role);

        @Prop({required: true})
        user: User;

        @Prop({required: true})
        onRoleChange: (User, Role) => void;

        onSelect(role: Role) {
            this.onRoleChange(this.user, role);
        }
    }

</script>

<style scoped>

</style>
