import {Component} from '@angular/core';

@Component({
  selector: 'app-pages-listdevice',
  template: `
    <webview class="webview" src="http://localhost:4200/"></webview>
  `,
  styles: [`
    .webview {
      height: 100%;
      width: 100%;
    }
  `]
})
export class WebComponent {
  constructor() {

  }
}
