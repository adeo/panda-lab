import {RuntimeEnv} from "../services/services.provider";
<template>
    <div id="root">
        <div class="md-layout">
            <div id="menu" class="md-layout-item  md-small-size-10  md-medium-size-20 md-size-15">
                <md-list id="menu-list">
                    <div v-for="(menu, index) in menuItems" v-bind:key="index"
                         :class="[isRoute(menu.link)?'selected':'']" class="item-decorator-container"
                         @click="!isRoute(menu.link) ? openPage(menu.link) : ''">
                        <div class="item-decorator">
                            <div class="top-border"></div>
                            <div class="bottom-border"></div>
                        </div>
                        <md-list-item class="menu-item"
                                      >
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
    import {getRuntimeEnv, RuntimeEnv} from "../services/services.provider";


    @Component
    export default class RootPage extends Vue {

        menuItems: MenuItem[] = [
            {
                name: "Home",
                icon: "home",
                link: "/home"
            },
            {
                name: "Devices",
                icon: "devices",
                link: "/devices"
            },
            {
                name: "Groups",
                icon: "group_work",
                link: "/groups"
            },
            {
                name: "Jobs",
                icon: "schedule",
                link: "/jobs"
            },
            {
                name: "Applications",
                icon: "apps",
                link: "/applications"
            }
        ];

        isElectron: Boolean = getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER;
        private route: string;

        constructor() {
            super();
            if (this.isElectron) {
                this.menuItems.push({
                    name: 'Agent',
                    link: '/agentDevices',
                    icon: 'phone_android'
                })
            }
        }

        @Watch('$route', {immediate: true, deep: true})
        onUrlChange(newVal: any) {
            this.route = this.$route.path
            console.log("route", this.route)
            // Some action
        }

        protected isRoute(link: string): boolean {
            return this.route.startsWith(link)
        }

        protected openPage(link) {
            console.log("open link", link)
            this.$router.push(link)
        }
    }

    interface MenuItem {
        name: string,
        icon: string,
        link: string,
    }

</script>
<style scoped lang="scss">

    @import '../assets/css/theme';


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

    #menu {
        background: $primary-color;
    }

    .item-decorator-container {
        position: relative;
        cursor: pointer;
        margin-top: 24px;
    }

    #menu-list {
        background: transparent;
        width: 95%;
        margin-left: 5%;
        margin-top: 100px;

        .item-content {
            color: white;
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

        .item-decorator-container.selected {
            z-index: 0;

            .item-decorator {
                position: absolute;
                right: 0;
                height: 48*2px;
                top: -24px;
                width: 24px;
                background: white;
                overflow: hidden;

                div {
                    border-radius: 100%;
                    background: $primary-color;
                    width: 200%;
                    height: 48px;
                    left: -24px;
                    position: absolute;
                }

                .top-border {
                    top: -24px
                }

                .bottom-border {
                    bottom: -24px
                }
            }
        }


    }

    #content {
        padding: 24px;
    }

    @media (max-width: 960px) {
        #menu-list {
            width: 100%;
            margin-left: 0;
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
