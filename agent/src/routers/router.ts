import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import {AuthentConfiguredGuard, AuthentNotConfiguredGuard} from "./authent.guards";
import Home from "@/components/Home.vue";
import Jobs from "@/components/Jobs.vue";
import Device from "../components/devices/Device.vue";
import Applications from "@/components/Applications.vue";
import Job from "@/components/Job.vue";
import JobTaskDetail from "@/components/JobTaskDetail.vue";
import Auth from "@/components/auth/Auth.vue";
import Splash from "../components/auth/Splash.vue";
import AgentDevices from "../components/agent/AgentDevices.vue";
import Devices from "../components/devices/Devices.vue";

Vue.use(VueRouter);

const AUTHENT_ROUTE: RouteConfig = {
    path: '/login',
    component: Auth,
    beforeEnter: AuthentNotConfiguredGuard
};

const SPLASH_ROUTE: RouteConfig = {
    path: '/splash',
    component: Splash
};


const HOME_ROUTE: RouteConfig = {
    path: '/',
    component: Home,
    beforeEnter: AuthentConfiguredGuard,

    children: [
        {path: '/', redirect: 'devices'},
        {path: 'devices', component: Devices,},
        {path: 'agentDevices', component: AgentDevices,},
        {path: 'jobs', component: Jobs,},
        {path: 'jobs/:jobId', component: Job},
        {path: 'jobs/:jobId/tasks/:taskId', component: JobTaskDetail},
        {path: 'phone', component: Jobs,},
        {path: 'devices/:deviceId', component: Device,},
        {path: 'applications', component: Applications,},
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

