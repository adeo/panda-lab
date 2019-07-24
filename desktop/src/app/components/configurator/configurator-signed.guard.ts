import {ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';

/**
 * Check if the agent has a custom token registered on the page
 * If has not a custom token registered then it will be redirected to the configurator page.
 */
@Injectable({
  providedIn: 'root'
})
export class ConfiguratorSignedGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router, private firebaseService: FirebaseService) {
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const hasToken = this.firebaseService.agentToken !== null;
    console.log('IsSignedInGuard ', hasToken);
    if (!hasToken) {
      this.router.navigate(['/configurator']);
    }
    return hasToken;
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(childRoute, state);
  }
}
