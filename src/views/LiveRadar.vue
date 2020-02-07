<template>
    <HereMap apikey="INSERT_API_KEY_HERE"
            lat="46.9479"
            lng="7.4446"
            width="100%"
            height="835px" />
</template>

<script>
// @ is an alias to /src
import HereMap from "../components/map/HereMap.vue"

export default {
  name: 'LiveRadar',
    components: {
      HereMap
  },  
}
</script>
