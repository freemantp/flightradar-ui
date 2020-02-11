<template>
  <div class="about">
    <h1>This is the flight log</h1>
    <ul>
      <li v-for="flight in flights" :key="flight.id">{{flight.cls}}</li>
    </ul>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import Component from 'vue-class-component'
  import { FlightRadarService } from '../services/backendService'
  import { Flight } from '../model/backendModel'

  @Component
  export default class FlightLog extends Vue {
    
    flights: Array<Flight> = []
    
    async mounted() {
      
      const frService = new FlightRadarService();
      this.flights = await frService.getFlights();

      console.log(`Fetched ${this.flights.length} flights` );
    }    
  }
</script>
