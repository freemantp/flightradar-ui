<template>
  <nav>
    <router-link to="/">
      <i class="bi bi-radar"></i>
      Live Radar
    </router-link>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    <router-link to="/flightlog">
      <i class="bi bi-card-list"></i>
      Flight log
    </router-link>
  </nav>
  <router-view />
</template>

<script>
import { Configuration } from '@/config';
import { defineComponent, provide } from '@vue/runtime-core';
import { FlightRadarServiceImpl } from '@/services/flightRadarServiceImpl';
import { FlightRadarServiceMock } from '@/services/flightRadarServiceMock';
import { Tooltip } from 'bootstrap';

export default defineComponent({
  name: 'App',

  setup() {
    provide('frService', Configuration.isMockData() ? new FlightRadarServiceMock() : new FlightRadarServiceImpl());
  },

  mounted() {
    //inizialize Bootstrap tooltips
    new Tooltip(document.body, {
      selector: "[data-bs-toggle='tooltip']",
    });
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 10px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
