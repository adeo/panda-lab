import {NavigationGuard} from "vue-router";
import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";

export const AuthentNotConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    console.log(`AuthentNotConfiguredGuard() isConfigured = ${isConfigured}`);
    if (!isConfigured) {
        next();
    } else {
        if(getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER){
            next('/splash');
        }else{
            next('/');
        }
    }
};

export const AuthentConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    console.log(`AuthentConfiguredGuard() isConfigured = ${isConfigured}`);
    if (!isConfigured) {
        next('/login');
    } else {
        next();
    }
};

function isConfiguredAsync(): Promise<boolean> {
    return Services.getInstance().authService.isConnected();
}
