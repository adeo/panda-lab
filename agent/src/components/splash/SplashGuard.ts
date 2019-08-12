import {NavigationGuard} from "vue-router";
import {firebaseService} from "@/services/firebase.service";

export const SplashNotConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    console.log(`SplashConfiguredGuard() isConfigured = ${isConfigured}`);
    if (!isConfigured) {
        next();
    } else {
        next('/home');
    }
};

export const SplashConfiguredGuard: NavigationGuard = async (to, from, next) => {
    const isConfigured = await isConfiguredAsync();
    if (!isConfigured) {
        next('/');
    } else {
        next();
    }
};

async function isConfiguredAsync(): Promise<boolean> {
    return await firebaseService.agentToken !== null && firebaseService.isConnected;
}
