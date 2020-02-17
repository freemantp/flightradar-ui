<template>
  <div class="about">
    <h1>Recent flights <b-badge pill variant="primary" v-if="loaded" >{{flights.length}}</b-badge></h1>
    <b-spinner v-if="!loaded" label="Spinning"></b-spinner>

   

    <FlightLogEntry v-for="flight in flights" :key="flight.id" 
                  v-bind:icao24='flight.icao24' 
                  v-bind:callsign='flight.cls' 
                  v-bind:lastContact='flight.lstCntct' 
                  />
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import Component from 'vue-class-component'
  import { FlightRadarService } from '../services/backendService'
  import { Flight } from '../model/backendModel'
  import FlightLogEntry from '../components/flights/flightlogEntry.vue'

  @Component({ components: {
    FlightLogEntry
  }})
  export default class FlightLog extends Vue {
    
    flights: Array<Flight> = []
    loaded: boolean = false;
    
    async mounted() {
      
      const frService = new FlightRadarService();
      this.flights = await frService.getFlights();
      this.loaded = true;

      console.log(`Fetched ${this.flights.length} flights` );
    }    
  }
</script>
