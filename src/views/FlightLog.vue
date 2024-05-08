<template>
  <div class="about">
    <div v-if="flights.length == 0" class="spinner-border" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    Filter:
    <button type="button" class="btn btn-sm" @click="toggleBoolean" :class="{ 'btn-outline-secondary': !militaryFilter, 'btn-outline-dark': militaryFilter }">Military</button>
    <FlightlogEntry v-for="flight in flights" :key="flight.id" v-bind:flight="flight" class="mx-auto" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, inject, ref } from 'vue';
import { Flight } from '@/model/backendModel';
import { FlightRadarService } from '../services/flightRadarService';
import FlightlogEntry from '@/components/flights/FlightlogEntry.vue';

let flights = ref<Array<Flight>>([]);

const frService = inject('frService') as FlightRadarService;

let intervalId = ref<ReturnType<typeof setTimeout>>();

let militaryFilter = ref<boolean>(false);

let loadData = async () => {
  try {
    const limit = 100;
    let filter = militaryFilter.value ? 'mil' : undefined;
    flights.value = await frService.getFlights(limit, filter);
  } catch (err) {
    console.error('Could not recent flights:' + err);
  }
};

onMounted(() => {
  console.log(`the component is now mounted.`);

  loadData();

  intervalId.value = setInterval(() => {
    loadData();
  }, 5000);
});

onBeforeUnmount(() => {
  if (intervalId.value) clearInterval(intervalId.value);
});

let toggleBoolean = () => {
  militaryFilter.value = !militaryFilter.value;

  flights.value = [];
  loadData();
};
</script>
