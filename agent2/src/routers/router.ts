import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import Splash from "@/components/splash/Splash.vue";
import {SplashConfiguredGuard, SplashNotConfiguredGuard} from "@/components/splash/SplashGuard";
import Home from "@/components/Home.vue";
import Website from "@/components/Website.vue";
import ListDevice from "@/components/ListDevice.vue";
import Jobs from "@/components/Jobs.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
    {
        path: '/',
        component: Splash,
        beforeEnter: SplashNotConfiguredGuard,
    },
    {
        path: '/home',
        component: Home,
        beforeEnter: SplashConfiguredGuard,
        children: [
            {
                path: '',
                component: Website,
            },
            {
                path: '/listDevice',
                component: ListDevice
            },
            {
                path: '/jobs',
                component: Jobs
            }
        ]
    },
];

export const router = new VueRouter({
    routes
});

