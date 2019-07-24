const remote = require('electron').remote;
// Internal service
export const adb = remote.require('adbkit').createClient();
export const request = remote.require('request');
console.log(request);
export const Readable = remote.require('stream').Readable;
console.log(Readable);
export const UUID = remote.require('../src/uuid.ts').UUID;

// Store
const Store = require('electron-store');
export const store = new Store();
