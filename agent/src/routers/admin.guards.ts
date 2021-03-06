import {NavigationGuard} from "vue-router";
import {getRuntimeEnv, RuntimeEnv, Services} from "../services/services.provider";
import {first} from "rxjs/operators";
import {Role} from "pandalab-commons";

export const AdminGuard: NavigationGuard = async (to, from, next) => {
    const isWeb = getRuntimeEnv() == RuntimeEnv.WEB;
    if (isWeb) {
        const user = await Services.getInstance().authService.listenUser().pipe(first()).toPromise();
        console.log(`role =  ${user.role}`);
        if (user.role === Role.admin) {
            next();
            return;
        }
    }
    next('/home');
};


export const LogoutGuard: NavigationGuard = async (to, from, next) => {
    await Services.getInstance().authService.logout();
    next('/login');
};
