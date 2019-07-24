import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ConsoleModule} from './console/console.module';
import {AuthModule} from './auth/auth.module';
import {NotFoundComponent} from './console/error/notFound.component';
import {IsNotSignedInGuard} from './@core/device/auth/is-not-signed-in.guard';
import {IsSignedInGuard} from './@core/device/auth/is-signed-in.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => AuthModule,
    canActivate: [ IsNotSignedInGuard ]
  },
  {
    path: 'console',
    loadChildren: () => ConsoleModule,
    canActivate: [ IsSignedInGuard ]
  },
  {
    path: '',
    redirectTo: '/auth',
    pathMatch: 'full'
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {enableTracing: false})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
