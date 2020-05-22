<template>
  <div>
    <b-container>
      <b-row>
        <b-col>
            <detail-field label="Callsign" :text="flight ? flight.cls : null"/>
        </b-col>            
        <b-col>
            <detail-field label="Silhouette" :imageUrl="silhouetteUrl(aircraft ? aircraft.icaoType: null)"/>
        </b-col>
      </b-row>        
      <b-row>
        <b-col>
            <detail-field label="Registraton" :text="aircraft ? aircraft.reg: null"/>
        </b-col>
        <b-col>
            <detail-field label="24 bit address" :text="aircraft ? aircraft.icao24 : null"/>
        </b-col>
      </b-row>        
      <b-row>
        <b-col>
            <detail-field :label="typeLabel" :text="aircraft ? aircraft.type : null"/>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
           <detail-field label="Operator" :text="aircraft ? aircraft.op : null"/>
        </b-col>
      </b-row> 
    </b-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { FlightRadarService } from "@/services/flightRadarService";
import { Flight, Aircraft } from "@/model/backendModel";
import { AircraftIcon } from "@/mixins/aircraftIcon";
import DetailField from '@/components/flights/detailField.vue'

import { LayoutPlugin } from 'bootstrap-vue'

Vue.use(LayoutPlugin)

@Component({
    name: 'flight-detail',
    components: {DetailField}
})
export default class FlightDetail extends mixins(AircraftIcon) {

  @Prop(String) readonly flightID!: string;

  public flight: Flight | null = null;

  public aircraft: Aircraft | null = null;

  @Watch("flightID")
  async onFlightIdChanged(val: string, oldVal: string) {

    this.flight = null;
    this.aircraft = null;

    if (this.flightID) {
      this.flight = await this.frService.getFlight(this.flightID);
      this.aircraft = await this.frService.getAircraft(this.flight.icao24);
    }
  }
  
  get typeLabel(): string {
    return `Type (${this.aircraft ? this.aircraft.icaoType : ''})`;
  }

  @Inject("radarService") readonly frService!: FlightRadarService;
}
</script>

<style scoped>
.categoryText {
  font-size: 0.6em;
  text-transform: uppercase;
  color: rgb(100, 100, 100);
  position: absolute;
  top: 0px;
  left: 0px;
  border: 1px solid;
}

.valueText {
  font-size: 0.6em;
  text-transform: uppercase;
  color: rgb(100, 100, 100);
  position: absolute;
  top: 0px;
  left: 0px;
  border: 1px solid;
}
</style>