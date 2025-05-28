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
import { differenceInSeconds } from 'date-fns';
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
  },
);

onMounted(() => {
  initializeMap();
  map.setCenter({ lat: props.lat, lng: props.lng });

  try {
    radarService.registerPositionsCallback((positions) => {
      if (positions) {
        updateAircaftPositions(positions);
      }
    });
  } catch (error) {
    console.error('Failed to register positions callback:', error);
  }

  updateData();

  if (props.peridicallyRefresh) {
    intervalId.value = setInterval(() => {
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

onBeforeUnmount(async () => {
  if (intervalId.value) clearInterval(intervalId.value);
  
  radarService.disconnectPositionsWebSocket();
  
  for (const flightId of flightPositionCallbacks.keys()) {
    radarService.disconnectFlightPositionsWebSocket(flightId);
  }
  flightPositionCallbacks.clear();
});

const loadLivePositions = async () => {
  const positions = radarService.getCurrentPositions();
  if (positions && positions.size > 0) {
    updateAircaftPositions(positions);
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
    const flightId = selectedFlight.flightId;
    
    // Disconnect from WebSocket if connected
    if (flightPositionCallbacks.has(flightId)) {
      radarService.disconnectFlightPositionsWebSocket(flightId);
      flightPositionCallbacks.delete(flightId);
    }
    
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

/**
 * Calculate the bearing/heading from one point to another in degrees (0-360)
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Heading in degrees (0-360)
 */
const calculateHeading = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  // Convert to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;
  
  // Calculate heading
  const y = Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  let heading = Math.atan2(y, x) * 180 / Math.PI;
  
  // Normalize to 0-360
  heading = (heading + 360) % 360;
  
  return heading;
};

const convertToHereCoords = (flPos: TerrestialPosition, positions?: Map<string, TerrestialPosition>): HereCoordinates => {
  // If track/heading is available, use it directly
  if (flPos.track !== undefined) {
    return { lat: Number(flPos.lat), lng: Number(flPos.lon), heading: flPos.track } as HereCoordinates;
  }
  
  // If we have positions and can find previous positions for the same flight, calculate heading
  if (positions && flPos.icao) {
    // Try to find the previous position for this aircraft
    const positionEntries = Array.from(positions.entries());
    
    // Look through previous positions to find one with the same ICAO
    for (let i = positionEntries.length - 1; i >= 0; i--) {
      const [_, prevPos] = positionEntries[i];
      if (prevPos.icao === flPos.icao && 
          (prevPos.lat !== flPos.lat || prevPos.lon !== flPos.lon)) {
        // Found a previous position for this aircraft that's different from current
        const heading = calculateHeading(
          prevPos.lat, 
          prevPos.lon, 
          flPos.lat, 
          flPos.lon
        );
        return { lat: Number(flPos.lat), lng: Number(flPos.lon), heading } as HereCoordinates;
      }
    }
  }
  
  // If no track/heading available and can't calculate, default to 0
  return { lat: Number(flPos.lat), lng: Number(flPos.lon), heading: 0 } as HereCoordinates;
};

const updateAircaftPositions = (positions: Map<string, TerrestialPosition>) => {
  positions.forEach((pos: TerrestialPosition, flightId: string) => {
    updateMarker(flightId, convertToHereCoords(pos, positions));
  });

  const now = new Date();

  // Purge stale markers
  for (let [key, value] of markers) {
    if (differenceInSeconds(now, value.lastUpdated) > 15) {
      removeMarker(key);
    }
  }
};

// Map to store flight position callbacks
const flightPositionCallbacks = new Map<string, (positions: TerrestialPosition[]) => void>();

const updateSelectedFlightPath = async () => {
  // This function is kept for compatibility with the interval-based approach
  // but it's not actively used for WebSocket-connected flights
  if (selectedFlight && !flightPositionCallbacks.has(selectedFlight.flightId)) {
    try {
      const flightId = selectedFlight.flightId;
      radarService.getPositions(flightId).subscribe({
        next: (positions: TerrestialPosition[]) => {
          // Only update if the selected flight hasn't changed during the async call
          if (selectedFlight && selectedFlight.flightId === flightId && positions && positions.length > 0) {
            selectedFlight.updateFlightPath(positions);
          }
        },
        error: (error) => {
          // Network error or API issue - silently handle the error
          console.error('Error fetching flight positions:', error);
          // Don't remove the flight path on update errors to maintain current state
        }
      });
    } catch (error) {
      // Handle any synchronous errors
      console.error('Error setting up position subscription:', error);
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
    const previousFlight = selectedFlight;
    if (previousFlight && previousFlight.flightId !== flightId) {
      if (flightPositionCallbacks.has(previousFlight.flightId)) {
        radarService.disconnectFlightPositionsWebSocket(previousFlight.flightId);
        flightPositionCallbacks.delete(previousFlight.flightId);
      }
      
      if (markers.has(previousFlight.flightId)) {
        markers.get(previousFlight.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
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

    const positionsCallback = (positions: TerrestialPosition[]) => {
      // Only update if this is still the selected flight
      if (selectedFlight && selectedFlight.flightId === flightId && positions && positions.length > 0) {
        selectedFlight.updateFlightPath(positions);
      }
    };
    
    flightPositionCallbacks.set(flightId, positionsCallback);
    radarService.registerFlightPositionsCallback(flightId, positionsCallback);
    
    // Initial positions will come through the WebSocket
  } catch (error) {
    console.error('Error setting up flight path:', error);
    // If there's an error, clean up current selection
    if (selectedFlight && selectedFlight.flightId === flightId) {
      const flightToRemove = selectedFlight;
      selectedFlight = null;
      flightToRemove.removeFlightPath();

      // Also reset the marker color since selection failed
      if (markers.has(flightId)) {
        markers.get(flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
      
      if (flightPositionCallbacks.has(flightId)) {
        radarService.disconnectFlightPositionsWebSocket(flightId);
        flightPositionCallbacks.delete(flightId);
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
