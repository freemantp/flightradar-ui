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

onMounted(() => {
  initializeMap();
  map.setCenter({ lat: props.lat, lng: props.lng });

  updateData();

  if (props.peridicallyRefresh) {
    //TODO: stop update when navigating away
    intervalId.value = setInterval(() => {
      updateData();
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

onBeforeUnmount(async () => {
  if (intervalId.value) clearInterval(intervalId.value);
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
    console.log('unselectFlight:' + selectedFlight.flightId);
    selectedFlight.removeFlightPath();
    selectedFlight = null;
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
    console.log('deleted flight: ' + id);
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
    // Make sure any previous flight is completely unselected
    if (selectedFlight) {
      selectedFlight.removeFlightPath();
      selectedFlight = null;
    }
    
    // Create a new flight path
    selectedFlight = new FlightPath(flightId, map);
    const positions: TerrestialPosition[] = await radarService.getPositions(flightId);

    if (selectedFlight && positions && positions.length > 0) {
      selectedFlight.createFlightPath(positions);
    }
  } catch (error) {
    // If there's an error fetching positions, clean up the flight path
    if (selectedFlight) {
      selectedFlight.removeFlightPath();
      selectedFlight = null;
    }
  }
};

const emitFlightId = (flightId: string) => {
  emit('onMarkerClicked', `${flightId}`);
};

const selectFlight = (flightId: string) => {
  unselectFlight();

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
