<template>
    <div id="root">
        <div class="md-layout">
            <div id="menu"
                 class="pl-theme-primary-inverse md-layout-item  md-small-size-10  md-medium-size-20 md-size-15">
                <img id="logo" src="../assets/images/logo_neg.svg"/>

                <md-list id="menu-list">

                    <div v-for="(menu, index) in menuItems" v-bind:key="index"
                         :class="[isRoute(menu.link)?'selected':'']" class="item-decorator-container"
                         @click="!isRoute(menu.link) ? openPage(menu.link) : ''">
                        <div class="item-decorator">
                            <div class="top-border pl-theme-primary-inverse"></div>
                            <div class="bottom-border pl-theme-primary-inverse"></div>
                        </div>
                        <md-list-item class="menu-item">
                            <md-icon class="md-list-item-icon item-content">
                                {{menu.icon}}
                            </md-icon>
                            <span class="md-list-item-text item-content"> {{menu.name}}</span>
                        </md-list-item>
                    </div>

                </md-list>
            </div>
            <div id="content" class="md-layout-item md-small-size-90 md-medium-size-80 md-size-85">
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
    import {Component, Vue, Watch} from 'vue-property-decorator';
    import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";
    import {Role} from "pandalab-commons";


    @Component
    export default class RootPage extends Vue {
        static MENU = [
            {
                name: "Home",
                icon: "home",
                link: "/home",
                role: Role.user,
            },
            {
                name: "Devices",
                icon: "phone_android",
                link: "/devices",
                role: Role.user,
            },
            {
                name: "Groups",
                icon: "group_work",
                link: "/groups",
                role: Role.user,
            },
            {
                name: "Jobs",
                icon: "schedule",
                link: "/jobs",
                role: Role.user,
            },
            {
                name: "Applications",
                icon: "apps",
                link: "/applications",
                role: Role.user,
            },
            {
                name: "Agents",
                icon: "devices",
                link: "/agents",
                role: Role.user,
            },
            {
                name: 'Agent',
                link: '/agentDevices',
                icon: 'important_devices',
                role: Role.agent,
            },
            {
                name: "Admin",
                icon: "security",
                link: "/admin",
                role: Role.admin,
            },
            {
                name: "Logout",
                icon: "logout",
                link: "/logout",
                role: Role.guest,
            }
        ];

        protected isElectron: Boolean = getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER;
        protected route: string;
        protected menuItems: MenuItem[] = [];

        constructor() {
            super();
        }

        mounted(){
            this.$subscribeTo(Services.getInstance().authService.listenUser(), user => {
                this.updateMenu(Role[user.role])
            });
        }

        updateMenu(role: Role) {
            this.menuItems = RootPage.MENU.filter(
                value => {
                    switch (value.role) {
                        case Role.admin:
                            return [Role.admin].indexOf(role) >= 0;
                        case Role.guest:
                            return [Role.guest, Role.admin, Role.user, Role.agent].indexOf(role) >= 0;
                        case Role.user:
                            return [Role.admin, Role.user, Role.agent].indexOf(role) >= 0;
                        case Role.agent:
                            return [Role.agent].indexOf(role) >= 0;
                    }
                }
            );
        }


        @Watch('$route', {immediate: true, deep: true})
        onUrlChange(newVal: any) {
            this.route = this.$route.path;
        }

        protected isRoute(link: string): boolean {
            return this.route.startsWith(link)
        }

        protected openPage(link) {
            this.$router.push(link)
        }
    }

    interface MenuItem {
        name: string,
        icon: string,
        link: string,
        role: Role,
    }

</script>
<style scoped lang="scss">

    #root {
        height: 100%;
        width: 100%;
        position: absolute;
    }

    .md-layout {
        height: 100%;
    }

    .md-layout-item {
        transition: max-width 0.3s ease, min-width 0.3s ease;
    }

    .item-decorator-container {
        position: relative;
        cursor: pointer;
        margin-top: 24px;
    }

    #logo {
        width: 80%;
        display: block;
        margin: auto;
        padding-top: 10px;
    }

    #menu-list {

        background: transparent;
        width: 95%;
        margin-left: 5%;

        .item-content {
            color: white;
        }

        .md-icon {
            margin-right: 20px;
        }

        .item-decorator-container:hover, .item-decorator-container.selected {
            background: white;
            border-top-left-radius: 24px;
            border-bottom-left-radius: 24px;
            z-index: 1;

            .item-content {
                color: black;
            }
        }

        $menu-size: 48px;

        .item-decorator-container .item-decorator div {
            border-radius: 0;
        }

        .item-decorator-container.selected {
            z-index: 0;

            .item-decorator {
                position: absolute;
                right: 0;
                height: $menu-size*2;
                top: -$menu-size/2;
                width: $menu-size/2;
                background: white;
                overflow: hidden;

                div {
                    border-radius: 100%;
                    transition: border-radius 0.3s ease;
                    width: 200%;
                    height: $menu-size;
                    left: -$menu-size/2;
                    position: absolute;
                }

                .top-border {
                    top: -$menu-size/2;
                }

                .bottom-border {
                    bottom: -$menu-size/2;
                }
            }
        }


    }

    #content {
        background: white;
        height: 100%;
        overflow: scroll;
    }

    @media (max-width: 960px) {
        #menu-list {
            width: 98%;
            margin-left: 2%;
        }
        .md-list-item-text {
            display: none;
        }
        .md-list-item-icon {
            flex: 1;
            margin-right: 0 !important;
        }
    }


</style>
