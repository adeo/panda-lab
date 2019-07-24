import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatIconModule,
  MatListModule,
  MatProgressSpinnerModule,
  MatSlideToggleModule,
  MatToolbarModule,
  MatTooltipModule
} from '@angular/material';
import {WebComponent} from './web/web.component';
import {PreferencesComponent} from './preference/preferences.component';
import {WebviewDirective} from './web/webview.directive';
import {ListDeviceComponent} from './listDevice/listDevice.component';
import {PagesRoutingModule} from './pages-routing.module';
import {PagesComponent} from './pages.component';

@NgModule({
  declarations: [
    PagesComponent,
    ListDeviceComponent,
    WebComponent,
    PreferencesComponent,
    WebviewDirective
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  providers: []
})
export class PagesModule {

}
