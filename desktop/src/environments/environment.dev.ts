// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `index.ts`, but if you do
// `ng build --env=prod` then `index.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const AppConfig = {
  production: false,
  environment: 'DEV',
  firebase: {
    apiKey: 'AIzaSyB-LYCs9okzeQFQbhi3t0fhe8qq44h6pt0',
    authDomain: 'panda-lab-lm.firebaseapp.com',
    projectId: 'panda-lab-lm',
    databaseURL: 'https://panda-lab-lm.firebaseio.com',
  }
};
