import Vue from 'vue';
import VueRouter, {RouteConfig} from 'vue-router';
import {AuthentGuard} from "./authent.guards";
import RootPage from "../components/RootPage.vue";
import Jobs from "../components/jobs/JobsPage.vue";
import JobsPage from "../components/jobs/JobsPage.vue";
import Device from "../components/devices/DevicePage.vue";
import AuthPage from "../components/auth/AuthPage.vue";
import SplashPage from "../components/auth/SplashPage.vue";
import AgentPage from "../components/agent/AgentPage.vue";
import DevicesPage from "../components/devices/DevicesPage.vue";
import Groups from "../components/groups/Groups.vue";
import GroupDetails from "../components/groups/GroupDetails.vue";
import AppsPage from "../components/apps/AppsPage.vue";
import AppDetailsPage from "../components/apps/AppDetailsPage.vue";
import ReportPage from "../components/report/ReportPage.vue";
import VersionDetailsPage from '../components/apps/VersionDetailsPage.vue';
import AdminPage from '../components/admin/AdminPage.vue';
import {AdminGuard, LogoutGuard} from "./admin.guards";
import AgentsList from "../components/agents/AgentsList.vue";
import AgentDetail from "../components/agents/AgentDetail.vue";
import JobPage from "../components/jobs/JobPage.vue";
import DialogCreateJob from "../components/jobs/DialogCreateJob.vue";
import GuestPage from "../components/auth/GuestPage.vue";
import HomePage from "../components/home/HomePage.vue";

Vue.use(VueRouter);

const AUTHENT_ROUTE: RouteConfig = {
    path: '/login',
    component: AuthPage,
    beforeEnter: AuthentGuard
};

const SPLASH_ROUTE: RouteConfig = {
    path: '/splash',
    component: SplashPage,
    beforeEnter: AuthentGuard
};

const GUEST_ROUTE: RouteConfig = {
    path: '/guest',
    component: GuestPage,
    beforeEnter: AuthentGuard,
}

const LOGOUT_ROUTE: RouteConfig = {
    path: '/logout',
    beforeEnter: LogoutGuard
}


const HOME_ROUTE: RouteConfig = {
    path: '/',
    component: RootPage,
    beforeEnter: AuthentGuard,

    children: [
        {path: '/', redirect: 'home'},
        {path: 'home', component: HomePage},
        {path: 'devices', component: DevicesPage,},
        {path: 'groups', component: Groups,},
        {path: 'groups/:groupId', component: GroupDetails,},
        {path: 'agentDevices', component: AgentPage,},
        {path: 'jobs', component: JobsPage,},
        {path: 'jobs/:jobId', component: JobPage},
        {path: 'phone', component: Jobs,},
        {path: 'devices/:deviceId', component: Device,},
        {path: 'applications', component: AppsPage,},
        {path: 'applications/:applicationId', component: AppDetailsPage,},
        {path: 'applications/:applicationId/versions/:versionId', component: VersionDetailsPage,},
        {path: 'applications/:applicationId/versions/:versionId/createJob', component: DialogCreateJob,},
        {path: 'reports/:reportId', component: ReportPage,},
        {path: 'agents', component: AgentsList,},
        {path: 'agents/:agentId', component: AgentDetail,},
        {
            path: '/admin',
            component: AdminPage,
            beforeEnter: AdminGuard
        },
    ]
};


const routes: Array<RouteConfig> = [
    AUTHENT_ROUTE,
    SPLASH_ROUTE,
    GUEST_ROUTE,
    LOGOUT_ROUTE,
    HOME_ROUTE,
];

export const router = new VueRouter({
    routes
});

