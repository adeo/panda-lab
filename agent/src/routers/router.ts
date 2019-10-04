import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import {AuthentGuard} from "./authent.guards";
import RootPage from "@/components/RootPage.vue";
import Jobs from "@/components/Jobs.vue";
import Device from "../components/devices/Device.vue";
import JobTaskDetail from "@/components/JobTaskDetail.vue";
import Auth from "@/components/auth/Auth.vue";
import Splash from "../components/auth/Splash.vue";
import AgentPage from "../components/agent/AgentPage.vue";
import Devices from "../components/devices/Devices.vue";
import Groups from "../components/groups/Groups.vue";
import GroupDetails from "../components/groups/GroupDetails.vue";
import Apps from "../components/apps/Apps.vue";
import AppDetails from "../components/apps/AppDetails.vue";
import Report from "../components/report/Report.vue";
import VersionDetail from '../components/apps/VersionDetail.vue';
import AdminPage from '../components/admin/AdminPage.vue';

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
    component: RootPage,
    beforeEnter: AuthentGuard,

    children: [
        {path: '/', redirect: 'devices'},
        {path: '/home', redirect: 'devices'},
        {path: 'devices', component: Devices,},
        {path: 'groups', component: Groups,},
        {path: 'groups/:groupId', component: GroupDetails,},
        {path: 'agentDevices', component: AgentPage,},
        {path: 'jobs', component: Jobs,},
        // {path: 'jobs/:jobId', component: Job},
        {path: 'jobs/:jobId/tasks/:taskId', component: JobTaskDetail},
        {path: 'phone', component: Jobs,},
        {path: 'devices/:deviceId', component: Device,},
        {path: 'applications', component: Apps,},
        {path: 'applications/:applicationId', component: AppDetails,},
        {path: 'applications/:applicationId/versions/:versionId', component: VersionDetail,},
        {path: 'reports/:reportId', component: Report,},
        {path: '/admin', component: AdminPage, }
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

