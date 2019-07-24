import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import {AuthService} from './auth.service';

/**
 * Check if the user is logged in on a page where it should be
 * If it is not connected then it will be redirected to the login page
 */
@Injectable({
  providedIn: 'root'
})
export class IsSignedInGuard implements CanActivate {

  constructor(private router: Router, private authService: AuthService) {
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const hasUser = await this.authService.isConnected();
    if (hasUser !== true) {
      this.router.navigate(['/auth']);
    }
    return hasUser;
  }
}
