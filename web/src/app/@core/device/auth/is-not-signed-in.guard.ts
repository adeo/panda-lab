import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';
import {AuthService} from './auth.service';

/**
 * Check if the user is logged on a page where it should not be
 * If it is connected then it will be redirected to the admin console
 */
@Injectable({
  providedIn: 'root'
})
export class IsNotSignedInGuard implements CanActivate {

  constructor(private router: Router, private authService: AuthService) {
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const hasUser = await this.authService.isConnected();
    if (hasUser === true) {
      this.router.navigate(['/console']);
      return false;
    }
    return true;
  }
}
