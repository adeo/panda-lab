import {Component} from '@angular/core';
import {AuthService} from '../@core/device/auth/auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'console',
  template: `
    <div class="container">
      <mat-toolbar class="mat-elevation-z4">
        <button mat-icon-button (click)="drawer.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        <h1 class="app-name"><b>Panda</b>Lab</h1>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #drawer class="sidenav" mode="side">
          <mat-list class="menu-list">
            <mat-list-item class="menu-list-item">
              <a routerLink="/console" routerLinkActive="active">
                <mat-icon class="menu-list-item-icon">phone_android</mat-icon>
                Devices
              </a>
            </mat-list-item>
            <mat-list-item class="menu-list-item">
              <button class="connexion-card-button" mat-button (click)="signOut()">
                <mat-icon class="menu-list-item-icon">group</mat-icon>
                Groupes
              </button>
            </mat-list-item>
            <mat-list-item class="menu-list-item">
              <button class="connexion-card-button" mat-button (click)="signOut()">
                <mat-icon class="menu-list-item-icon">close</mat-icon>
                Déconnexion
              </button>
            </mat-list-item>
          </mat-list>
        </mat-sidenav>

        <mat-sidenav-content class="sidenav-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .menu-list {
      margin-top: 56px;
    }

    .menu-list-item {
      width: 100px;

    }

    .menu-list-item-icon {
      margin-right: 5px;
    }

    .container {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .mat-elevation-z4 {
      position: fixed;
      z-index: 4;
    }

    h1.app-name {
      margin-left: 8px;
    }

    .sidenav {

    }

    .sidenav-container {
      flex: 1;
    }

    .sidenav-content {
      background-color: #546e7a;
      margin-top: 65px;
    }

    .is-mobile .sidenav-container {
      flex: 1 0 auto;
    }
  `]
})
export class ConsoleComponent {

  constructor(private authService: AuthService, private router: Router) {
  }

  private async signOut() {
    await this.authService.signOut();
    await this.router.navigate(['/']);
  }

}
