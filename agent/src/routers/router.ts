import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import {AuthentGuard} from "./authent.guards";
import Home from "@/components/Home.vue";
import Jobs from "@/components/Jobs.vue";
import Device from "../components/devices/Device.vue";
import Applications from "@/components/Applications.vue";
// import Job from "@/components/Job.vue";
import JobTaskDetail from "@/components/JobTaskDetail.vue";
import Auth from "@/components/auth/Auth.vue";
import Splash from "../components/auth/Splash.vue";
import AgentDevices from "../components/agent/AgentDevices.vue";
import Devices from "../components/devices/Devices.vue";
import Groups from "../components/groups/Groups.vue";
import GroupDetails from "../components/groups/GroupDetails.vue";
import Apps from "../components/apps/Apps.vue";
import AppDetails from "../components/apps/AppDetails.vue";

Vue.use(VueRouter);

const AUTHENT_ROUTE: RouteConfig = {
    path: '/login',
    component: Auth,
    beforeEnter: AuthentGuard
};

const SPLASH_ROUTE: RouteConfig = {
    path: '/splash',
    component: Splash,
    beforeEnter: AuthentGuard
};


const HOME_ROUTE: RouteConfig = {
    path: '/',
    component: Home,
    beforeEnter: AuthentGuard,

    children: [
        {path: '/', redirect: 'devices'},
        {path: 'devices', component: Devices,},
        {path: 'groups', component: Groups,},
        {path: 'groups/:groupId', component: GroupDetails,},
        {path: 'agentDevices', component: AgentDevices,},
        {path: 'jobs', component: Jobs,},
        // {path: 'jobs/:jobId', component: Job},
        {path: 'jobs/:jobId/tasks/:taskId', component: JobTaskDetail},
        {path: 'phone', component: Jobs,},
        {path: 'devices/:deviceId', component: Device,},
        {path: 'applications', component: Apps,},
        {path: 'applications/:applicationId', component: AppDetails,},
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

