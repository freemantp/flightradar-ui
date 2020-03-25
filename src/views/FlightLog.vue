<template>
  <div class="about">

    <b-spinner v-if="flights.length == 0" label="Spinning"></b-spinner>

    <FlightLogEntry v-for="flight in flights" :key="flight.id" 
                  v-bind:icao24='flight.icao24' 
                  v-bind:callsign='flight.cls' 
                  v-bind:lastContact='new Date(flight.lstCntct)' 
                  class="mx-auto"
                  />
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import Component from 'vue-class-component';
  import FlightLogEntry from '../components/flights/flightlogEntry.vue';
  import { FlightRadarService } from '../services/backendService';
  import { Flight } from '../model/backendModel';
  

  @Component({ components: {
    FlightLogEntry
  }})
  export default class FlightLog extends Vue {
    
    flights: Array<Flight> = []

    async loadData() {
      // TODO: use DI
      const frService = new FlightRadarService();
      this.flights = await frService.getFlights(30);
    }
    
    async mounted() {

      this.loadData();      


      //TODO: stop update when navigating away
      setInterval( () => {
        console.log('delayed');
         this.loadData();
      }, 5000)
    }    
  }
</script>
