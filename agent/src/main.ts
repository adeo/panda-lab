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

Vue.directive('init', {
    bind: function(el, binding, vnode) {

        // convert kebab-case to camelCase
        let arg = binding.arg.split('-').map((arg, index) => {
            return (index > 0) ? arg[0].toUpperCase() + arg.substring(1) : arg;
        }).join('');

        vnode.context[arg] = binding.value;
    }
});

import './assets/css/theme.scss'

new Vue({
    render: h => h(App),
}).$mount('#app');

// background process
// Prepare workspace and watch jobs tasks
