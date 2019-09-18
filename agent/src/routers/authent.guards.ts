import {NavigationGuard} from "vue-router";
import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";
import {first, map} from "rxjs/operators";
import {AgentStatus} from "../services/repositories/agent.repository";

export const AuthentGuard: NavigationGuard = async (to, from, next) => {
    const isLogged = await isUserLoggedAsync();

    if (!isLogged) {
        next("/login")
    } else {
        const isConfigured = await isConfiguredAsync();
        if (!isConfigured) {
            next("/splash")
        } else {
            next()
        }
    }
};

// export const AuthentNotConfiguredGuard: NavigationGuard = async (to, from, next) => {
//     const isLogged = await isUserLoggedAsync();
//     const isConfigured = await isConfiguredAsync();
//     if (!isLogged) {
//         next('/login');
//     } else if (!isConfigured) {
//         next('');
//     } else {
//
//         if (getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER) {
//             next('/splash');
//         } else {
//             next('/');
//         }
//     }
// };
//
//
// export const AuthentConfiguredGuard: NavigationGuard = async (to, from, next) => {
//     const isLogged = await isUserLoggedAsync();
//     const isConfigured = await isConfiguredAsync();
//     if (!isLogged) {
//         next('/login');
//     } else if (!isConfigured) {
//         next('/splash');
//     } else {
//         next()
//     }
// };

function isUserLoggedAsync(): Promise<boolean> {
    return Services.getInstance().authService.isConnected();
}

function isConfiguredAsync(): Promise<boolean> {
    if (getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER) {
        return Services.getInstance().agentService.isConfigured()
    } else {
        return Promise.resolve(true)
    }
}
