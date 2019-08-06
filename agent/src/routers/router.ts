import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import Splash from "@/components/splash/Splash.vue";
import {SplashConfiguredGuard, SplashNotConfiguredGuard} from "@/components/splash/SplashGuard";
import Home from "@/components/Home.vue";
import Website from "@/components/Website.vue";
import ListDevice from "@/components/ListDevice.vue";
import Jobs from "@/components/Jobs.vue";
import Devices from "@/components/Devices.vue";
import Device from "@/components/Device.vue";
import Applications from "@/components/Applications.vue";
import Job from "@/components/Job.vue";

Vue.use(VueRouter);


const SPLASH_ROUTE: RouteConfig = {
    path: '/',
    component: Splash,
    beforeEnter: SplashNotConfiguredGuard,
};

const HOME_ROUTE: RouteConfig = {
    path: '/home',
    component: Home,
    beforeEnter: SplashConfiguredGuard,
    children: [
        {path: '', component: Website,},
        {path: '/listDevice', component: ListDevice,},
        {path: '/jobs', component: Jobs,},
        {path: '/jobDetail', component: Job, name: "jobDetail"},
        {path: '/phone', component: Jobs,},
        {path: '/devices', component: Devices,},
        {path: '/devices/:deviceId', component: Device,},
        {path: '/applications', component: Applications,},
    ]
};


const routes: Array<RouteConfig> = [
    SPLASH_ROUTE,
    HOME_ROUTE,
];

export const router = new VueRouter({
    routes
});

