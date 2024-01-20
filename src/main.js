import vuetify from './plugins/vuetify'
import firebase from "firebase"
import Vue from 'vue'
import VueRouter from 'vue-router'
import VueMoment from 'vue-moment'
import VuetifyToast from 'vuetify-toast-snackbar-ng'
import App from './App.vue'
import Balance from './components/Balance'
import Exchanges from './components/Exchanges'
import Login from './components/Login'
import Orders from './components/Orders'
import Pools from './components/Pools'
import Rules from './components/Rules'
import Updater from './components/Updater'
import Follower from './components/Follower'
import Trades from './components/Trades'
import Services from './components/Services'
import { initializeContainer } from "../lib/container.mjs"
import { asFunction, asValue } from "awilix"
import { humanPrice } from './filters'


Vue.config.productionTip = false
Vue.use(VueRouter)
Vue.use(VueMoment)
Vue.use(VuetifyToast)

Vue.filter('humanPrice', humanPrice)

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    props: true,
  },
  {
    path: '/balance',
    name: 'balance',
    component: Balance,
    props: true
  },
  {
    path: '/exchanges',
    name: 'exchanges',
    component: Exchanges,
    props: true,
  },
  {
    path: '/pools',
    name: 'pools',
    component: Pools,
    props: true
  },
  {
    path: '/rules',
    name: 'rules',
    component: Rules,
    props: true
  },
  {
    path: '/updater',
    name: 'updater',
    component: Updater,
    props: true
  },
  {
    path: '/follower',
    name: 'follower',
    component: Follower,
    props: true
  },
  {
    path: '/trades',
    name: 'trades',
    component: Trades,
    props: true
  },
  {
    path: '/orders',
    name: 'orders',
    component: Orders,
    props: true
  },
  {
    path: '/services',
    name: 'services',
    component: Services,
    props: true
  },
]

const router = new VueRouter({
  routes
})


initializeContainer()
  .then(($registry) => {
    $registry.register({
      firebase: asFunction(({ databaseUrl }) => {
        const firebaseConfig = {
          databaseURL: databaseUrl,
          apiKey: process.env.VUE_APP_DATABASE_API_KEY,
          authDomain: process.env.VUE_APP_DATABASE_AUTH_DOMAIN,
          projectId: process.env.VUE_APP_DATABASE_PROJECT_ID,
          storageBucket: process.env.VUE_APP_DATABASE_STORAGE_BUCKET,
          messagingSenderId: process.env.VUE_APP_DATABASE_MESSAGING_SENDER_ID,
          appId: process.env.VUE_APP_DATABASE_APP_ID
        }

        firebase.initializeApp(firebaseConfig)
        return firebase
      }).singleton(),

      db: asFunction(({ firebase }) => {
        return firebase.database()
      }).singleton(),

      realFetch: asFunction(() => window.fetch),

      privateKey: asValue([]),
    })

    const { cradle } = $registry;
    new Vue({
      provide() {
        return {
          $registry,
          $cradle: cradle
        };
      },
      router,
      vuetify,
      render: (h) => h(App)
    }).$mount("#app");
  })
  .catch((error) => {
    console.log(error)
    console.error("Couldn't create DI container.");
  })
