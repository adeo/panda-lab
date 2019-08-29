import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import {AuthentConfiguredGuard, AuthentNotConfiguredGuard} from "../routers/authent.guards";
import Home from "@/components/Home.vue";
import Website from "@/components/Website.vue";
import ListDevice from "@/components/ListDevice.vue";
import Jobs from "@/components/Jobs.vue";
import Device from "@/components/Device.vue";
import Applications from "@/components/Applications.vue";
import Job from "@/components/Job.vue";
import JobTaskDetail from "@/components/JobTaskDetail.vue";
import Auth from "@/components/auth/Auth.vue";
import Splash from "../components/auth/Splash.vue";

Vue.use(VueRouter);

const AUTHENT_ROUTE: RouteConfig = {
    path: '/',
    component: Auth,
    beforeEnter: AuthentNotConfiguredGuard
};

const SPLASH_ROUTE: RouteConfig = {
    path: '/splash',
    component: Splash
    // beforeEnter: AuthentNotConfiguredGuard
};


const HOME_ROUTE: RouteConfig = {
    path: '/home',
    component: Home,
    beforeEnter: AuthentConfiguredGuard,
    children: [
        {path: '', component: Website,},
        {path: '/listDevice', component: ListDevice,},
        {path: '/jobs', component: Jobs,},
        {path: '/jobs/:jobId', component: Job},
        {path: '/jobs/:jobId/tasks/:taskId', component: JobTaskDetail},
        {path: '/phone', component: Jobs,},
        {path: '/devices/:deviceId', component: Device,},
        {path: '/applications', component: Applications,},
    ]
};


const routes: Array<RouteConfig> = [
    AUTHENT_ROUTE,
    SPLASH_ROUTE,
    HOME_ROUTE,
];

export const router = new VueRouter({
    routes
});

