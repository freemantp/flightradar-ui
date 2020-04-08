<template>
  <div id="app">
    <nav id="nav">
      <router-link to="/">Live Radar</router-link>|
      <router-link to="/flightlog">Flight log</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Provide } from 'vue-property-decorator'
  import { FlightRadarService} from './services/flightradarService'
  import { FlightRadarServiceImpl} from './services/flightRadarServiceImpl'
    @Component
    export default class FlightRadarNg extends Vue {
      @Provide() radarService: FlightRadarService = new FlightRadarServiceImpl();
    }

</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>

  