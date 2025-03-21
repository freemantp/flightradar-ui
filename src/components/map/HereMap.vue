<style>
#mapContainer {
  height: calc(100vh - 44px);
  width: 100%;
}
</style>
<template>
  <div id="mapContainer"></div>
</template>

<script setup lang="ts">
import { inject, onBeforeMount, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { TerrestialPosition } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { AircraftIcon, AircraftMarker } from '@/components/map/aircraftElements';
import { FlightPath, HereCoordinates } from '@/components/map/flightPath';
import moment from 'moment';
import _ from 'lodash';

const radarService = inject('frService') as FlightRadarService;

const props = defineProps({
  apikey: String,
  lat: String,
  lng: String,
  aerialOverview: Boolean, // If enabled displays a view of aircaft in the air
  highlightedFlightId: String, //If set displays the flightpath of the selected flight (historical and live)
  peridicallyRefresh: Boolean,
});

const emit = defineEmits(['onMarkerClicked']);

/* eslint-disable */
let platform: any;
let map: any;
let intervalId = ref<ReturnType<typeof setTimeout>>();

let aircraftIcon: AircraftIcon;
let selectedFlight: FlightPath | null;

let markers: Map<string, AircraftMarker> = new Map();
let iconSvgMap: Map<string, any> = new Map();

declare let H: any;

onBeforeMount(async () => {
  platform = new H.service.Platform({
    apikey: props.apikey,
  });

  aircraftIcon = new AircraftIcon(iconSvgMap);
});

watch(
  () => props.highlightedFlightId,
  () => {
    if (props.highlightedFlightId) {
      addFlightPath(props.highlightedFlightId);
    }
  }
);

watch(
  () => props.aerialOverview,
  (newValue) => {
    if (newValue) {
      // If aerial overview is enabled, connect to WebSocket
      connectWebSocket();
    } else {
      // If aerial overview is disabled, disconnect from WebSocket
      radarService.disconnectPositionsWebSocket();
    }
  }
);

onMounted(() => {
  initializeMap();
  map.setCenter({ lat: props.lat, lng: props.lng });

  updateData();

  if (props.aerialOverview) {
    connectWebSocket();
  }

  // For updates not handled by WebSocket (selected flight path)
  if (props.peridicallyRefresh) {
    intervalId.value = setInterval(() => {
      // Only update the selected flight path, since positions come via WebSocket
      if (props.highlightedFlightId || !_.isNull(selectedFlight)) {
        updateSelectedFlightPath();
      }
    }, 1000);
  } else {
    if (intervalId.value) clearInterval(intervalId.value);
  }
});

const updateData = () => {
  if (props.aerialOverview) {
    loadLivePositions();
  }
  if (props.highlightedFlightId || !_.isNull(selectedFlight)) {
    updateSelectedFlightPath();
  }
};

const connectWebSocket = () => {
  // Connect to WebSocket and receive live position updates
  radarService.connectPositionsWebSocket((positions) => {
    if (positions) {
      updateAircaftPositions(positions);
    }
  });
};

onBeforeUnmount(async () => {
  if (intervalId.value) clearInterval(intervalId.value);
  radarService.disconnectPositionsWebSocket();
});

const loadLivePositions = async () => {
  try {
    const positions = await radarService.getAircaftPositions();
    if (positions) {
      updateAircaftPositions(positions);
    }
  } catch (error) {
    // Handle API connection error silently
    // No need to show an error to the user
  }
};

const resetIcon = () => {
  if (selectedFlight && markers.has(selectedFlight.flightId)) {
    markers.get(selectedFlight.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
  }
};

const unselectFlight = () => {
  resetIcon();

  if (selectedFlight) {
    const flightToRemove = selectedFlight;
    selectedFlight = null; // Clear the reference first to prevent recursive cleanup
    flightToRemove.removeFlightPath();
  }
};

const removeMarker = (id: string) => {
  let marker = markers.get(id);

  if (marker) {
    if (selectedFlight && selectedFlight.flightId === id) {
      unselectFlight();
    }

    marker.remove();
    markers.delete(id);
    iconSvgMap.delete(id);
  }
};

const convertToHereCoords = (flPos: TerrestialPosition): HereCoordinates => {
  return { lat: Number(flPos.lat), lng: Number(flPos.lon), heading: flPos.track } as HereCoordinates;
};

const updateAircaftPositions = (positions: Map<string, TerrestialPosition>) => {
  positions.forEach((pos: TerrestialPosition, flightId: string) => {
    updateMarker(flightId, convertToHereCoords(pos));
  });

  const now = moment();

  // Purge stale markers
  for (let [key, value] of markers) {
    let currentTimestamp = moment(value.lastUpdated);
    if (now.diff(currentTimestamp, 'seconds') > 15) {
      removeMarker(key);
    }
  }
};

const updateSelectedFlightPath = async () => {
  if (selectedFlight) {
    try {
      const flightId = selectedFlight.flightId; // Store the ID in case it changes during async operation
      const positions: TerrestialPosition[] = await radarService.getPositions(flightId);
      
      // Only update if the selected flight hasn't changed during the async call
      if (selectedFlight && selectedFlight.flightId === flightId && positions && positions.length > 0) {
        selectedFlight.updateFlightPath(positions);
      }
    } catch (error) {
      // Network error or API issue - silently handle the error
      // Don't remove the flight path on update errors to maintain current state
    }
  }
};

const updateMarker = (id: string, coords: HereCoordinates) => {
  if (markers.has(id)) {
    let marker = markers.get(id);
    marker?.updatePosition(coords);
  } else {
    let marker = new AircraftMarker(id, coords, aircraftIcon, map, iconSvgMap);
    marker.onPointerDown((event: any) => selectFlight(event.target.getData()));
    markers.set(id, marker);
  }
};

const addFlightPath = async (flightId: string) => {
  try {
    // Store reference to previous flight for cleanup
    const previousFlight = selectedFlight;
    
    // Reset color of previously selected aircraft if it exists and it's different from the new selection
    if (previousFlight && previousFlight.flightId !== flightId && markers.has(previousFlight.flightId)) {
      markers.get(previousFlight.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
    }
    
    // Create the new flight path object before cleaning up the old one
    selectedFlight = new FlightPath(flightId, map);
    
    // Clean up previous flight path AFTER creating the new one to avoid duplicate cleanup
    if (previousFlight) {
      previousFlight.removeFlightPath();
    }
    
    // Highlight the newly selected aircraft marker
    if (markers.has(flightId)) {
      markers.get(flightId)?.setColor(AircraftIcon.HIGHLIGHT_COLOR);
    }
    
    // Fetch and add positions for the new flight
    const positions: TerrestialPosition[] = await radarService.getPositions(flightId);

    // Only try to create a path if we're still showing the same flight
    // (User hasn't selected another during the async operation)
    if (selectedFlight && selectedFlight.flightId === flightId && positions && positions.length > 0) {
      selectedFlight.createFlightPath(positions);
    }
  } catch (error) {
    // If there's an error fetching positions, clean up current selection
    if (selectedFlight && selectedFlight.flightId === flightId) {
      const flightToRemove = selectedFlight;
      selectedFlight = null;
      flightToRemove.removeFlightPath();
      
      // Also reset the marker color since selection failed
      if (markers.has(flightId)) {
        markers.get(flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
    }
  }
};

const emitFlightId = (flightId: string) => {
  emit('onMarkerClicked', `${flightId}`);
};

const selectFlight = (flightId: string) => {
  // Reset color of previously selected aircraft if it exists and it's not the same as the newly selected one
  if (selectedFlight && selectedFlight.flightId !== flightId && markers.has(selectedFlight.flightId)) {
    markers.get(selectedFlight.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
  }
  
  if (markers.has(flightId)) {
    markers.get(flightId)?.setColor(AircraftIcon.HIGHLIGHT_COLOR);
  }

  addFlightPath(flightId);
  emitFlightId(flightId);
};

const initializeMap = () => {
  let defaultLayers = platform.createDefaultLayers();

  const mapContainer = document.getElementById('mapContainer');

  // Instantiate (and display) a map object:
  map = new H.Map(mapContainer, defaultLayers.vector.normal.map, {
    center: { lat: props.lat, lng: props.lng },
    zoom: 8,
    pixelRatio: window.devicePixelRatio || 1,
  });

  // provided that map was instantiated with the vector layer as a base layer
  let baseLayer = map.getBaseLayer();
  baseLayer.getProvider().setStyle(new H.map.Style('/radar-style.yml'));

  window.addEventListener('resize', () => {
    map.getViewPort().resize();
  });
  // eslint-disable-next-line
  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
  // eslint-disable-next-line
  const ui = H.ui.UI.createDefault(map, defaultLayers);
};

defineExpose({ unselectFlight });
</script>

<style scoped></style>
