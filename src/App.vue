<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Live Radar</router-link>|
      <router-link to="/flightlog">Flight log</router-link>
    </div>
    <router-view />
  </div>
</template>

<script>
  import Vue from 'vue'

  export default Vue.extend({
    name: 'app'
  });

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

  