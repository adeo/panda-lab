import {NavigationGuard} from "vue-router";
import {authentService} from "@/services/authent.service";

export const AuthentNotConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    console.log(`AuthentConfiguredGuard() isConfigured = ${isConfigured}`);
    if (!isConfigured) {
        next();
    } else {
        next('/home');
    }
};

export const AuthentConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    if (!isConfigured) {
        next('/');
    } else {
        next();
    }
};

async function isConfiguredAsync(): Promise<boolean> {
    return await authentService.agentToken !== null && authentService.isConnected;
}
