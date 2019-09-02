import {NavigationGuard} from "vue-router";
import {Services} from "../services/services.provider";

export const AuthentNotConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = isConfiguredAsync();
    console.log(`AuthentConfiguredGuard() isConfigured = ${isConfigured}`);
    if (!isConfigured) {
        next();
    } else {
        next('/home');
    }
};

export const AuthentConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = isConfiguredAsync();
    if (!isConfigured) {
        next('/');
    } else {
        next();
    }
};

function isConfiguredAsync(): boolean {
    return  Services.getInstance().authService.isConnected;
}
