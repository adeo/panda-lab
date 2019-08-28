import {NavigationGuard} from "vue-router";
import {Services} from "../services/services.provider";

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
    return await Services.getInstance().authService.isConnected;
}
