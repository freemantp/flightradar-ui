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
  import Vue from 'vue';
  import Component from 'vue-class-component';
  import FlightLogEntry from '../components/flights/flightlogEntry.vue';
  import { Flight } from '../model/backendModel';
  import { Inject } from 'vue-property-decorator';
  import { FlightRadarService } from '@/services/flightradarService';

  @Component({ components: {
    FlightLogEntry
  }})
  export default class FlightLog extends Vue {
    
    public flights: Array<Flight> = []

    private intervalId?: number;

    @Inject('radarService') readonly frService!: FlightRadarService

    async loadData() {
      try {
        this.flights = await this.frService.getFlights(30);
      }
      catch(err) {
        console.error('Could not recent flights');
      }      
    }
    
    async mounted() {

      this.loadData();      

      this.intervalId = setInterval( () => {
         this.loadData();
      }, 5000)
    }    

    beforeDestroy () {
      clearInterval(this.intervalId);
    }
  }
</script>
