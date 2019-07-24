import {Component, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';
import {AbstractControl, FormControl, FormGroup, Validators} from '@angular/forms';
import {AuthService} from '../../@core/device/auth/auth.service';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material';

@Component({
  selector: 'auth-login',
  template: `
    <div class="connexion-container">
      <mat-card class="mat-typography connexion-card">
        <div>
          <img class="connexion-card-header-logo" src="https://www.brandcrowd.com/gallery/brands/pictures/picture1470952529624.png"/>
          <h2>Welcome to <b>PandaLab</b>, please log in.</h2>
        </div>
        <form [formGroup]="loginData" (ngSubmit)="validate()">
          <mat-form-field class="connexion-card-form-url">
            <input formControlName="login" type="text" matInput placeholder="Login">
          </mat-form-field>
          <mat-form-field class="connexion-card-form-url">
            <input formControlName="password" type="password" matInput placeholder="Password">
          </mat-form-field>
          <button type="submit" class="connexion-card-button connexion-card-button-submit" mat-raised-button color="primary">CONNEXION
          </button>
        </form>
        <button class="connexion-card-button" mat-button (click)="handleSignUp()">SIGN UP</button>
      </mat-card>
    </div>
  `,
  styles: [`

    .connexion-card-button {
      width: 100%;
      height: 50px;
      text-align: center;
      margin-top: 12px;
    }

    .connexion-card-button-submit {
      margin-top: 40px;
    }

    .connexion-card-form-url {
      width: 100%;
      height: 50px;
      margin-top: 20px;
      text-align: center;
      font-size: large;
    }

    .connexion-card {
      width: 550px;
      height: 600px;
      text-align: center;
      position: absolute;
      margin: auto;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .connexion-container {
      position: fixed;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      background-color: #546e7a;
      z-index: 10;
    }

    ::ng-deep .warning {
      background: red;
      color: white;
    }

    ::ng-deep .warning .mat-button {
      color: white;
    }
  `]
})
export class LoginComponent implements OnDestroy {
  private loginData: FormGroup;
  private errorSnackbar?: MatSnackBarRef<SimpleSnackBar>;


  constructor(private router: Router, private authService: AuthService, private snackBar: MatSnackBar) {
    this.loginData = new FormGroup({
      login: new FormControl('', Validators.compose([
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$')
        ]),
      ),
      password: new FormControl('', Validators.required),
    });
  }

  private get login(): string {
    return this.formValue('login');
  }

  private get password(): string {
    return this.formValue('password');
  }

  private displayError(error: Error) {
    this.errorSnackbar = this.snackBar.open(error.message, 'OK', {
      panelClass: ['warning']
    });
  }

  private dismissSnackbar() {
    if (this.errorSnackbar) {
      this.errorSnackbar.dismiss();
    }
  }

  private async validate() {
    try {
      await this.authService.signIn(this.login, this.password);
      await this.router.navigate(['./console']);
    } catch (e) {
      this.displayError(e);
    }
  }

  private async handleSignUp() {
    try {
      const success = await this.authService.signUp(this.login, this.password);
      console.log('Success = ' + success);
    } catch (e) {
      this.displayError(e);
    }
  }

  private formValue(key: string): string {
    if (!this.loginData.controls.hasOwnProperty(key)) {
      throw new Error(`Property ${key} is not defined in form`);
    }
    const control: AbstractControl = this.loginData.controls[key];
    return control.value;
  }

  ngOnDestroy(): void {
    this.dismissSnackbar();
  }
}
