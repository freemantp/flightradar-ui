<template>
<div>    
    <b-sidebar id="sidebar-1" v-model='sidebarVisible' shadow>
      <flight-detail :flightID="selectedFlight"/>
    </b-sidebar>

    <here-map v-bind:apikey="apiKey"
        lat="46.9479"
        lng="7.4446"
        width="100%"
        height="835px" 
        v-on:on-marker-clicked="updateSidebar($event)"
        :pathVisible="sidebarVisible"
        />
</div>
 
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator";
import { BSidebar } from 'bootstrap-vue'
import { Configuration } from '@/config'

import HereMap from '@/components/map/HereMap.vue' 
import FlightDetail from '@/components/flights/flightDetail.vue';

Vue.component('b-sidebar', BSidebar)

@Component({
  components: {HereMap, FlightDetail}
})
export default class LiveRadar extends Vue {

  constructor() {
    super();

    let apiKey = Configuration.value('hereApiKey');

    if(apiKey) {
      this.apiKey = apiKey;
    } else {
      throw 'HERE API key not defined'
    }
  }


  apiKey: string;

  sidebarVisible: boolean = false;

  selectedFlight: string|null = null;

  updateSidebar(flightId: string): void {
    this.sidebarVisible = true;
    this.selectedFlight = flightId;
  }

}

</script>
