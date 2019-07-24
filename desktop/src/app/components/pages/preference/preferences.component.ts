import {Component} from '@angular/core';
import {ElectronUtils} from '../../../utils/electron.utils';

@Component({
  selector: 'app-pages-listdevice',
  template: `
    <div class="preferences-list-container mat-elevation-z4">
      <h2 class="mat-h2">Preferences:</h2>
    </div>
  `,
  styles: [`
    .preferences-list-container {
      width: 600px;
      background-color: #fff;
      padding: 10px 15px 10px 15px;
      border-radius: 5px;
      margin: 30px;
      float: left;
    }
  `]
})
export class PreferencesComponent {

  constructor(private electronUils: ElectronUtils) {
    console.log('init preferences');
  }
}
