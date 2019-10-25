import {NavigationGuard} from "vue-router";
import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";
import {UserLab} from "../services/firebaseauth.service";
import {Role} from "pandalab-commons";

export const AuthentGuard: NavigationGuard = async (to, from, next) => {
    const user = await getUserAsync();

    let goto = null;

    if (user.uuid == null) {
        goto = "/login";
    } else if (!await isConfiguredAsync()) {
        goto = "/splash";
    }else if(user.role == Role.guest){
        goto = "/guest";
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

function getUserAsync(): Promise<UserLab> {
    return Services.getInstance().authService.getUser();
}


function isConfiguredAsync(): Promise<boolean> {
    if (getRuntimeEnv() == RuntimeEnv.ELECTRON_RENDERER) {
        return Services.getInstance().node.agentService.isConfigured()
    } else {
        return Promise.resolve(true)
    }
}
