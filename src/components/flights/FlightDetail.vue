<template>
  <div class="container text-center">
    <div class="row">
      <div class="col">
        <DetailField label="Callsign" :text="flight ? flight.cls : null" />
      </div>
      <div class="col">
        <DetailField label="Silhouette" :imageUrl="silhouetteUrl(aircraft && aircraft.icaoType ? aircraft.icaoType : '')" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <DetailField label="Registraton" :text="aircraft ? aircraft.reg : null" />
      </div>
      <div class="col">
        <DetailField label="24 bit address" :text="aircraft ? aircraft.icao24 : null" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <DetailField :label="typeLabel" :text="aircraft ? aircraft.type : null" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <DetailField label="Operator" :text="aircraft ? aircraft.op : null" />
      </div>
    </div>
  </div>
  <div></div>
</template>

<script setup lang="ts">
import DetailField from '@/components/flights/DetailField.vue';
import { Flight, Aircraft } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { computed, inject, watch, ref } from 'vue';
import { silhouetteUrl } from '@/components/aircraftIcon';

const props = defineProps({
  flightId: String,
});

let flight = ref<Flight>();
let aircraft = ref<Aircraft>();

const frService = inject('frService') as FlightRadarService;

watch(
  () => props.flightId,
  async (key, value) => {
    if (value) {
      flight.value = await frService.getFlight(value);
      try {
        aircraft.value = await frService.getAircraft(flight.value.icao24);
      } catch (err) {
        console.error(err);
      }
    }
  }
);

const typeLabel = computed(() => {
  return `Type (${aircraft.value ? aircraft.value.icaoType : ''})`;
});
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
