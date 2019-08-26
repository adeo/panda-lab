import * as ElectronStore from "electron-store";

export interface StoreRepository {

    save(key: string, value: string)


    load(key: string, defaultValue: string): string

}


export class ElectronStoreRepository implements StoreRepository {
    private store: ElectronStore<string>;

    public constructor() {

        const Store = require('electron-store');
        this.store = new Store();

    }

    load(key: string, defaultValue: string): string {
        return this.store.get(key, defaultValue)
    }

    save(key: string, value: string) {
        this.store.set(key, value)
    }

}


export class WebStoreRepository implements StoreRepository {

    public constructor() {

    }

    load(key: string, defaultValue: string): string {
        return localStorage.getItem(key) || defaultValue
    }

    save(key: string, value: string) {
        localStorage.setItem(key, value)
    }

}
