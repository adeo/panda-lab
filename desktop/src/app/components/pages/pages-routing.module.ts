import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PagesComponent} from './pages.component';
import {ListDeviceComponent} from './listDevice/listDevice.component';
import {WebComponent} from './web/web.component';
import {PreferencesComponent} from './preference/preferences.component';

const routes: Routes = [
  {
    path: '',
    component: PagesComponent,
    children: [
      {
        path: 'listDevice',
        component: ListDeviceComponent,
      },
      {
        path: 'web',
        component: WebComponent,
      },
      {
        path: 'preferences',
        component: PreferencesComponent,
      },
      {
        path: '',
        component: WebComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {


}
