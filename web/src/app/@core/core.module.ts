import {ModuleWithProviders, NgModule} from '@angular/core';
import {DevicesService} from './device/service/device.service';
import {CommonModule} from '@angular/common';
import {AuthService} from './device/auth/auth.service';

const SERVICES = [
  DevicesService,
  AuthService,
];

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule
  ],
  providers: [
    ...SERVICES
  ]
})
export class CoreModule {
  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: CoreModule,
      providers: [
        ...SERVICES,
      ],
    };
  }
}
