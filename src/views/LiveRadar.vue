<template>
    <HereMap v-bind:apikey="apiKey"
            lat="46.9479"
            lng="7.4446"
            width="100%"
            height="835px" />
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from "vue";
import Component from 'vue-class-component';

import HereMap from "../components/map/HereMap.vue"
import {HERE_API_KEY} from '../config'

@Component({
  components: {HereMap}
})
export default class LiveRadar extends Vue {
  apiKey: string = HERE_API_KEY;
}

</script>
