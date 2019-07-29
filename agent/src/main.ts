import Vue from 'vue'
import VueRx from 'vue-rx'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import App from './App.vue'

Vue.config.productionTip = false;
Vue.use(VueRx);
Vue.use(VueMaterial);


new Vue({
    render: h => h(App),
}).$mount('#app');
