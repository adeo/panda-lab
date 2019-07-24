import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-pages',
  template: `
    <div class="content-container">
      <router-outlet></router-outlet>
    </div>
    <mat-toolbar class="toolbar">
      <mat-toolbar-row>
        <img class="toolbar-logo" src="https://www.brandcrowd.com/gallery/brands/pictures/picture1470952529624.png"/>
        <button mat-icon-button class="toolbar-home-button" (click)="web()">
          <mat-icon>home</mat-icon>
        </button>
        <button mat-icon-button class="toolbar-devices-button" (click)="listDevice()">
          <mat-icon>phone_android</mat-icon>
        </button>
        <span class="spacer"></span>
        <button mat-icon-button class="toolbar-settings-button" (click)="preferences()">
          <mat-icon>settings</mat-icon>
        </button>
      </mat-toolbar-row>
    </mat-toolbar>
  `,
  styles: [`
    .content-container {
      position: fixed;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      padding-bottom: 56px;
      background-color: #546e7a;
    }
    
    .toolbar-logo {
      width: 55px;
      height: 45px;
    }

    .toolbar-home-button {

    }

    .toolbar-devices-button {
      margin-left: 20px;
    }

    .toolbar-settings-button {
      padding: 0 14px;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .toolbar {
      position: fixed;
      left: 0;
      bottom: 0;
    }
  `]
})
export class PagesComponent {

  constructor(private router: Router) {

  }

  web() {
    this.router.navigate(['./pages/web']);
  }

  listDevice() {
    this.router.navigate(['./pages/listDevice']);
  }

  preferences() {
    this.router.navigate(['./pages/preferences']);
  }
}
