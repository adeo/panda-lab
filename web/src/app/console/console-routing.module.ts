import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ListDeviceComponent} from "./listDevice/listDevice.component";
import {ConsoleComponent} from "./console.component";
import {NotFoundComponent} from "./error/notFound.component";

const routes: Routes = [
  {
    path: '',
    component: ConsoleComponent,
    children: [
      {
        path: 'listDevice',
        component: ListDeviceComponent
      },
      {
        path: '',
        component: ListDeviceComponent,
      },
      {
        path: '**',
        component: NotFoundComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsoleRoutingModule {


}
