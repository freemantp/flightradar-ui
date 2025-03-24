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
        <DetailField label="24 bit address" :text="flight ? flight.icao24.toUpperCase() : null" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <DetailField :label="typeLabel" :text="aircraft ? aircraft.type : null" />
      </div>
      <div class="col">
        <DetailField label="Operator" :text="aircraft ? aircraft.op : null" />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <DetailField label="Current Altitude" :text="currentAltitude" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DetailField from '@/components/flights/DetailField.vue';
import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { computed, inject, watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { silhouetteUrl } from '@/components/aircraftIcon';

const props = defineProps({
  flightId: String,
});

const flight = ref<Flight>();
const aircraft = ref<Aircraft>();
const currentPosition = ref<TerrestialPosition | null>(null);
let positionUpdateInterval: number | null = null;
// Track active WebSocket connection
let currentFlightId: string | null = null;

const frService = inject('frService') as FlightRadarService;

watch(
  () => props.flightId,
  // eslint-disable-next-line
  async (newValue, oldValue) => {
    // Clear current position when changing flights
    currentPosition.value = null;

    // Disconnect any existing WebSocket
    if (currentFlightId) {
      frService.disconnectFlightPositionsWebSocket(currentFlightId);
      currentFlightId = null;
    }

    if (newValue) {
      // Reset references
      flight.value = undefined;
      aircraft.value = undefined;

      // Fetch new flight data
      flight.value = await frService.getFlight(newValue);
      try {
        aircraft.value = await frService.getAircraft(flight.value.icao24);

        // Set up WebSocket for position updates
        currentFlightId = newValue;
        setupPositionWebSocket(newValue);

        // Get the current position (might be available immediately)
        updateCurrentPosition();
      } catch (err) {
        console.error(err);
        aircraft.value = undefined;
      }
    }
  },
);

onMounted(() => {
  // Get initial position data and set up WebSocket if needed
  if (props.flightId) {
    updateCurrentPosition();
    if (!currentFlightId) {
      currentFlightId = props.flightId;
      setupPositionWebSocket(props.flightId);
    }
  }

  // Maintain the interval as a fallback, but make it less frequent
  positionUpdateInterval = window.setInterval(() => {
    if (props.flightId && !currentPosition.value) {
      updateCurrentPosition();
    }
  }, 5000); // Fallback check every 5 seconds if no position is available
});

onBeforeUnmount(() => {
  // Clean up interval
  if (positionUpdateInterval) {
    window.clearInterval(positionUpdateInterval);
    positionUpdateInterval = null;
  }

  // Disconnect WebSocket
  if (currentFlightId) {
    frService.disconnectFlightPositionsWebSocket(currentFlightId);
    currentFlightId = null;
  }
});

// Set up WebSocket for position updates
const setupPositionWebSocket = (flightId: string) => {
  frService.registerFlightPositionsCallback(flightId, (positions: Array<TerrestialPosition>) => {
    // Only update if this is still the selected flight
    if (props.flightId === flightId && positions && positions.length > 0) {
      // Always use the most recent position from the array
      const latestPosition = positions[positions.length - 1];
      if (latestPosition && latestPosition.alt !== undefined) {
        currentPosition.value = latestPosition;
      }
    }
  });
};

const updateCurrentPosition = async () => {
  if (!props.flightId) return;

  const requestedFlightId = props.flightId;

  try {
    // First check if we have a live position from the main WebSocket
    const livePosition = frService.getCurrentPosition(requestedFlightId);

    // Only update if this is still the selected flight
    if (props.flightId === requestedFlightId && livePosition && livePosition.alt !== undefined) {
      currentPosition.value = livePosition;
      return;
    }

    // Fallback: try to get historical positions if live data doesn't have altitude
    const positions = await frService.getPositions(requestedFlightId);

    // Only update if this is still the selected flight (could have changed during the async call)
    if (props.flightId === requestedFlightId && positions && positions.length > 0) {
      const latestPosition = positions[positions.length - 1];

      if (latestPosition && latestPosition.alt !== undefined) {
        currentPosition.value = latestPosition;
        return;
      }
    }
  } catch (error) {
    console.error('Error fetching current position:', error);
  }
};

const currentAltitude = computed(() => {
  if (!currentPosition.value) {
    return 'N/A';
  }

  if (currentPosition.value.alt !== undefined && currentPosition.value.alt !== null) {
    return `${currentPosition.value.alt.toLocaleString()} ft`;
  }

  return 'N/A';
});

const typeLabel = computed(() => {
  return `Type (${aircraft.value?.icaoType ? aircraft.value.icaoType : 'Type'})`;
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
