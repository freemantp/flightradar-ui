<template>
    <div id="app">
        <HereMap
            apikey="INSERT_API_KEY_HERE"
            lat="46.9479"
            lng="7.4446"
            width="100%"
            height="835px" />
    </div>
</template>

<script>
    import HereMap from "./components/map/HereMap.vue"

    export default {
        name: 'app',
        components: {
            HereMap
        }
    }
</script>

<style>
    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
    }
</style>  
