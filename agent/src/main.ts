import Vue from 'vue'
import VueRx from 'vue-rx'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import App from './App.vue'
import {workspace} from "@/node/workspace";
import {jobSchedulers} from "@/node/job-schedulers";

Vue.config.productionTip = false;
Vue.use(VueRx);
Vue.use(VueMaterial);


new Vue({
    render: h => h(App),
}).$mount('#app');

// background process
// Prepare workspace and watch jobs tasks
workspace.prepare();
jobSchedulers.watch();
