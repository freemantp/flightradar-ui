<template>
<div class="flLogEntry">
    
    <img :src="silhouetteUrl" height="20px"/>
    <span>{{callsign}}</span>
    <span>{{aircraft.type}}</span>
    <span>{{aircraft.op}}</span>
    <span>{{icao24}}</span>
    
    <span>{{lastContact | moment("dddd HH:mm")}}</span>
  
</div>
</template>

<script lang="ts">
    import Vue from "vue";
    import Component from 'vue-class-component';
    import {Aircraft} from '../../model/backendModel';
import { FlightRadarService } from '@/services/backendService';

const FlightLogEntryProps = Vue.extend({
  props: {
      icao24: String,
      callsign: String,
      lastContact: Date
  }
})

  @Component
  export default class FlightLogEntry extends FlightLogEntryProps {
    
    aircraft: Aircraft = {
        icao24: this.icao24,
    };

    get silhouetteUrl(): string {
        return this.aircraft.icaoType ?        
         `/silhouettes/${this.aircraft.icaoType.toLowerCase()}.png`:
         '';
    }
    
    async mounted() {
      const frService = new FlightRadarService();
      this.aircraft = await frService.getAircraft(this.icao24);
      console.log(`Fetched flights` );
    }    
  }    
</script>

<style scoped>
.flLogEntry { 
    font-size:  1.2em;
    display: flex;
    justify-content: space-around;
    width: 1000px
}

</style>