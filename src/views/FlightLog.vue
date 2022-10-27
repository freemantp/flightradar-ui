<template>
  <div class="about">

Filter:
    <b-button size="sm" :pressed.sync="militaryFilter" :variant="buttonVariant">Military</b-button> 

    <b-overlay :show="flights.length == 0" rounded="sm">
        
      

      <flight-log-entry
        v-for="flight in flights"
        :key="flight.id"
        v-bind:flight="flight"
        class="mx-auto"/>

    </b-overlay>


  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import { BButton } from "bootstrap-vue";
import FlightLogEntry from "@/components/flights/flightlogEntry.vue";
import { Flight } from "@/model/backendModel";
import { Inject, Watch } from "vue-property-decorator";
import { FlightRadarService } from "@/services/flightRadarService";

@Component({
  components: {
    FlightLogEntry,
  },
})
export default class FlightLog extends Vue {
  public flights: Array<Flight> = [];

  public militaryFilter: boolean = false;
  public show: boolean = false;

  private intervalId?: NodeJS.Timeout;

  @Inject("radarService") readonly frService!: FlightRadarService;

  get buttonVariant(): string {
    return this.militaryFilter ? "secondary" : "outline-secondary";
  }

  @Watch("militaryFilter")
  async onFiilterChanged(val: string, oldVal: string) {
    this.flights = [];
    this.loadData();
  }

  async loadData() {
    try {
      let limit: number = 200;
      let filter: string | null = this.militaryFilter ? "mil" : null;
      this.flights = await this.frService.getFlights(limit, filter);
    } catch (err) {
      console.error("Could not recent flights");
    }
  }

  async mounted() {
    this.loadData();

    this.intervalId = setInterval(() => {
      this.loadData();
    }, 5000);
  }

  beforeDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
</script>
