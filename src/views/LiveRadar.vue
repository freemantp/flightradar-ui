<template>
    <HereMap v-bind:apikey="apiKey"
            lat="46.9479"
            lng="7.4446"
            width="100%"
            height="835px" />
</template>

<script>
// @ is an alias to /src
import HereMap from "../components/map/HereMap.vue"
import {HERE_API_KEY} from '../config'

export default {
  name: 'LiveRadar',
  components: {HereMap},  
  data() {
    return {
      apiKey: HERE_API_KEY
    }
  }
}
</script>
