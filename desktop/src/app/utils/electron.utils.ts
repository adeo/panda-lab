import {Injectable} from '@angular/core';
import {ElectronService} from '../providers/electron.service';

@Injectable()
export class ElectronUtils {

  private readonly Store: any;
  private store: any;

  constructor(private electronService: ElectronService) {
    this.Store = electronService.remote.require('electron-store');
    this.store = new this.Store();
  }

  storeSet(key: string, data: any) {
    this.store.set(key, data);
  }

  storeGet(key: string): any {
    return this.store.get(key);
  }

  storeDelete(key: string) {
    this.store.delete(key);
  }
}
