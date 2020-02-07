import Vue from 'vue'
import VueRouter from 'vue-router'
import LiveRadar from '../views/LiveRadar.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'LiveRadar',
    component: LiveRadar
  },
  {
    path: '/flightlog',
    name: 'FlightLog',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/FlightLog.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
