import {NavigationGuard} from "vue-router";
import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";

export const AuthentGuard: NavigationGuard = async (to, from, next) => {
    const isLogged = await isUserLoggedAsync();

    let goto = null;

    if (!isLogged) {
        goto = "/login";
    } else if (!await isConfiguredAsync()) {
        goto = "/splash";
    }

    if (goto != null && goto !== to.path) {
        console.log("AuthentGuard redirect to " + goto);
        next(goto)
    } else {
        console.log("AuthentGuard authorized " + to.path);
        next()
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
        return Services.getInstance().node.agentService.isConfigured()
    } else {
        return Promise.resolve(true)
    }
}
