import Vue from 'vue'
import VueRx from 'vue-rx'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import App from './App.vue'
import {Services} from "./services/services.provider";


Services.setup({
    apiKey: process.env.VUE_APP_API_KEY,
    authDomain: process.env.VUE_APP_AUTH_DOMAIN,
    projectId: process.env.VUE_APP_PROJECT_ID,
    databaseURL: process.env.VUE_APP_DATABASE_URL,
    messagingSenderId: process.env.VUE_APP_MESSAGING_SENDER_ID,
    storageBucket: process.env.VUE_APP_STORAGE_BUCKET,
    apiURL: process.env.VUE_APP_API_URL
});

Vue.config.productionTip = false;
Vue.use(VueRx);
Vue.use(VueMaterial);


new Vue({
    render: h => h(App),
}).$mount('#app');

// background process
// Prepare workspace and watch jobs tasks
