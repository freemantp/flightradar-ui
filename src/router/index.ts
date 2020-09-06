import Vue from 'vue'
import VueRouter from 'vue-router'
import LiveRadar from '@/views/LiveRadar.vue'
import FlightView from '@/views/FlightView.vue'

Vue.use(VueRouter)

const routesDecriptor = [
  {
    path: '/',
    name: 'home',
    component: LiveRadar
  },
  {
    path: '/flightlog', 
    name: 'flightlog',
    // route level code-splitting
    // this generates a separate chunk (*.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('@/views/FlightLog.vue')
  },
  {
    path: '/flight/:flightId',
    name: 'flightview',
    component: FlightView
  }
]

const router = new VueRouter({
  //mode: 'history',
  routes: routesDecriptor
})

export default router
