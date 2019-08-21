import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import Splash from "@/components/splash/Splash.vue";
import {SplashConfiguredGuard, SplashNotConfiguredGuard} from "@/components/splash/SplashGuard";
import Home from "@/components/Home.vue";
import Website from "@/components/Website.vue";
import ListDevice from "@/components/ListDevice.vue";
import Jobs from "@/components/Jobs.vue";
import Device from "@/components/Device.vue";
import Applications from "@/components/Applications.vue";
import Job from "@/components/Job.vue";
import JobTaskDetail from "@/components/JobTaskDetail.vue";
import Auth from "@/components/auth/Auth.vue";

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
        {path: '', component: Auth,},
        {path: '/listDevice', component: ListDevice,},
        {path: '/jobs', component: Jobs,},
        {path: '/jobs/:jobId', component: Job},
        {path: '/jobs/:jobId/tasks/:taskId', component: JobTaskDetail},
        {path: '/phone', component: Jobs,},
        {path: '/devices/:deviceId', component: Device,},
        {path: '/applications', component: Applications,},
        {path: '/auth', component: Auth,}
    ]
};


const routes: Array<RouteConfig> = [
    SPLASH_ROUTE,
    HOME_ROUTE,
];

export const router = new VueRouter({
    routes
});

