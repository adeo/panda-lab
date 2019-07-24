import {HomeComponent} from './components/home/home.component';
import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ConfiguratorComponent} from './components/configurator/configurator.component';
import {ConfiguratorNotSignedGuard} from './components/configurator/configurator-not-signed.guard';
import {ConfiguratorSignedGuard} from './components/configurator/configurator-signed.guard';
import {PagesModule} from './components/pages/pages.module';

const routes: Routes = [
  {
    path: 'configurator',
    component: ConfiguratorComponent,
    canActivate: [ConfiguratorNotSignedGuard]
  },
  {
    path: 'pages',
    loadChildren: () => PagesModule,
    canActivateChild: [ConfiguratorSignedGuard],
  },
  {
    path: '',
    redirectTo: '/configurator',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
