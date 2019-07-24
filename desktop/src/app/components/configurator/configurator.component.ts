import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {FirebaseService} from '../../services/firebase.service';
import {Router} from '@angular/router';

enum State {
  LOADING,
  SUCCESS,
  ERROR
}

@Component({
  selector: 'app-configurator',
  template: `
    <h1>Splash</h1>
    <ng-container *ngIf="state === SplashState.SUCCESS; then tokenSuccess; else tokenNotSuccess"></ng-container>
    <ng-template #tokenNotSuccess>
      <ng-container *ngIf="state === SplashState.LOADING; then tokenLoading; else tokenError"></ng-container>
    </ng-template>
    <ng-template #tokenSuccess>
      <div>Bravo ! Votre token a bien été créé.</div>
      <button mat-button (click)="onHandleNext()">Suivant</button>
    </ng-template>
    <ng-template #tokenLoading>
      <div>Création du token en cours...</div>
    </ng-template>
    <ng-template #tokenError>
      <div>
        Une erreur est survenue lors de la création du token
      </div>
      <button mat-button (click)="onHandleRetry()">Réessayer</button>
    </ng-template>
  `
})
export class ConfiguratorComponent implements OnInit, OnDestroy {

  private SplashState = State;
  private subscription: Subscription;
  private state: State;

  constructor(private firebaseService: FirebaseService, private router: Router) {
  }

  ngOnInit(): void {
    if (this.firebaseService.agentToken === null) {
      this.createAgentToken();
    } else {
      console.log('Agent token already exist');
    }
  }

  private initState(success: boolean) {
    if (success) {
      this.state = State.SUCCESS;
    } else {
      this.state = State.ERROR;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createAgentToken() {
    this.state = State.LOADING;
    this.subscription = this.firebaseService
      .createAgentToken()
      .subscribe(success => {
        console.log('createAgentToken() onNext', success);
        this.initState(success);
      }, error => {
        console.error('createAgentToken()', error);
        this.initState(false);
      }, () => {
        console.log('createAgentToken() finish');
      });
  }

  private onHandleRetry() {
    this.createAgentToken();
  }

  private onHandleNext() {
    this.router.navigate(['/pages']);
  }

}
