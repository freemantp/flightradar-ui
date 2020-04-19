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
        />
</div>
 
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import Component from 'vue-class-component';

import HereMap from '../components/map/HereMap.vue' 
import FlightDetail from '../components/flights/flightDetail.vue';
import {HERE_API_KEY} from '../config'

@Component({
  components: {HereMap, FlightDetail}
})
export default class LiveRadar extends Vue {
  apiKey: string = HERE_API_KEY;

  sidebarVisible: boolean = false;

  selectedFlight: string|null = null;

  updateSidebar(flightId: string): void {
    this.sidebarVisible = true;
    this.selectedFlight = flightId;
  }

}

</script>
