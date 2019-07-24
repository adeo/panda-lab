import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';

/**
 * Check if the agent has a custom token registered on the page
 * If has custom token registered then it will be redirected to the other pages
 */
@Injectable({
  providedIn: 'root'
})
export class ConfiguratorNotSignedGuard implements CanActivate {

  constructor(private router: Router, private firebaseService: FirebaseService) {
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const hasToken = await this.firebaseService.agentToken !== null;
    console.log('IsNotSignedInGuard ', hasToken);
    if (hasToken) {
      this.router.navigate(['/pages']);
    }
    return !hasToken;
  }
}
