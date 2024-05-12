<template>
  <div id="mapContainer" v-bind:style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { inject, onBeforeMount, onMounted, onBeforeUnmount, ref } from 'vue';
import { TerrestialPosition } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { AircraftIcon, AircraftMarker } from '@/components/map/aircraftElements';
import { FlightPath, HereCoordinates } from '@/components/map/flightPath';
import moment from 'moment';

const frService = inject('frService') as FlightRadarService;

const props = defineProps({
  appId: String,
  lat: String,
  lng: String,
  width: String,
  height: String,
  apikey: String,
  pathVisible: Boolean,
  liveMode: Boolean,
  flightId: String,
});

const emit = defineEmits(['onMarkerClicked']);

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

onMounted(async () => {
  initializeMap();
  map.setCenter({ lat: props.lat, lng: props.lng });

  if (props.liveMode) {
    //TODO: stop update when navigating away
    intervalId.value = setInterval(() => {
      loadLivePositions();
      if (selectedFlight) {
        updateFlightPath(selectedFlight.flightId);
      }
    }, 1000);
  } else if (props.flightId) {
    selectFlight(props.flightId);
  }
});

onBeforeUnmount(async () => {
  if (intervalId.value) clearInterval(intervalId.value);
});

const loadLivePositions = async () => {
  const positions = await frService.getLivePositions();
  updateAircraft(positions);
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

const updateAircraft = (positions: Map<string, TerrestialPosition>) => {
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

const updateFlightPath = async (flightId: string) => {
  if (selectedFlight) {
    const positions: TerrestialPosition[] = await frService.getPositions(flightId);
    selectedFlight.updateFlightPath(positions);
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
  const positions: TerrestialPosition[] = await frService.getPositions(flightId);
  if (selectedFlight) {
    selectedFlight.createFlightPath(positions);
  }
};

const emitFlightId = (flightId: string) => {
  emit('onMarkerClicked', `${flightId}`);
};

const selectFlight = (flightId: string) => {
  console.log(`selected flight: ${flightId}`);
  unselectFlight();

  if (markers.has(flightId)) {
    markers.get(flightId)?.setColor(AircraftIcon.HIGHLIGHT_COLOR);
  }

  selectedFlight = new FlightPath(flightId, map);

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

  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
  const ui = H.ui.UI.createDefault(map, defaultLayers);
};

defineExpose({ unselectFlight });
</script>

<style scoped></style>
