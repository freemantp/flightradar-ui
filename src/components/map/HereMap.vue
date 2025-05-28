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
import { useFlightStore, usePositionStore, useMapStore, useWebSocketStore } from '@/stores';
import { differenceInSeconds } from 'date-fns';
import _ from 'lodash';

const radarService = inject('frService') as FlightRadarService;

// Pinia stores
const flightStore = useFlightStore();
const positionStore = usePositionStore();
const mapStore = useMapStore();
const webSocketStore = useWebSocketStore();

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
let selectedFlightPath: FlightPath | null;

let markers: Map<string, AircraftMarker> = new Map();
let iconSvgMap: Map<string, any> = new Map();

declare let H: any;

onBeforeMount(async () => {
  // Initialize map store configuration
  mapStore.setApiKey(props.apikey || '');
  mapStore.updateConfig({
    aerialOverview: props.aerialOverview || false,
    periodicRefresh: props.peridicallyRefresh || false
  });

  platform = new H.service.Platform({
    apikey: props.apikey,
  });

  aircraftIcon = new AircraftIcon(iconSvgMap);
});

// Watch for props changes
watch(
  () => props.highlightedFlightId,
  (newFlightId) => {
    if (newFlightId) {
      mapStore.highlightFlight(newFlightId);
      flightStore.selectFlight(newFlightId);
      addFlightPath(newFlightId);
    } else {
      mapStore.clearHighlight();
      flightStore.clearSelectedFlight();
    }
  },
);

// Watch for store-based flight selection changes
watch(
  () => flightStore.selectedFlightId,
  (newFlightId, oldFlightId) => {
    if (oldFlightId && oldFlightId !== newFlightId) {
      // Clear previous selection
      if (markers.has(oldFlightId)) {
        markers.get(oldFlightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
    }
    
    if (newFlightId && newFlightId !== oldFlightId) {
      // Highlight new selection
      if (markers.has(newFlightId)) {
        markers.get(newFlightId)?.setColor(AircraftIcon.HIGHLIGHT_COLOR);
      }
    }
  },
);

// Watch for map center changes from store
watch(
  () => mapStore.center,
  (newCenter) => {
    if (map && mapStore.isInitialized) {
      map.setCenter(newCenter);
    }
  },
  { deep: true }
);

// Watch for map zoom changes from store
watch(
  () => mapStore.zoom,
  (newZoom) => {
    if (map && mapStore.isInitialized) {
      map.setZoom(newZoom);
    }
  }
);

onMounted(() => {
  initializeMap();
  
  // Set initial map center from props or store default
  const initialCenter = {
    lat: Number(props.lat) || mapStore.center.lat,
    lng: Number(props.lng) || mapStore.center.lng
  };
  map.setCenter(initialCenter);
  mapStore.setCenter(initialCenter);
  mapStore.setInitialized(true);

  webSocketStore.registerPositionsWebSocket(radarService, (positions: Map<string, TerrestialPosition>) => {
    if (positions) {
      updateAircaftPositions(positions);
    }
  });

  updateData();

  if (props.peridicallyRefresh) {
    intervalId.value = setInterval(() => {
      if (props.highlightedFlightId || !_.isNull(selectedFlightPath)) {
        updateSelectedFlightPath();
      }
    }, mapStore.config.refreshInterval);
  } else {
    if (intervalId.value) clearInterval(intervalId.value);
  }
});

const updateData = () => {
  if (mapStore.isAerialViewEnabled) {
    loadLivePositions();
  }
  if (mapStore.highlightedFlightId || !_.isNull(selectedFlightPath)) {
    updateSelectedFlightPath();
  }
};

onBeforeUnmount(async () => {
  if (intervalId.value) clearInterval(intervalId.value);
  
  // Clean up WebSocket connections via store
  webSocketStore.disconnectAllWebSockets(radarService);
  
  // Reset map store state
  mapStore.setInitialized(false);
});

const loadLivePositions = async () => {
  // Try to get positions from store first
  const storePositions = positionStore.getCurrentPositions;
  if (storePositions.size > 0) {
    updateAircaftPositions(storePositions);
    return;
  }
  
  // Fallback to service if store is empty
  const positions = radarService.getCurrentPositions();
  if (positions && positions.size > 0) {
    updateAircaftPositions(positions);
  }
};

const resetIcon = () => {
  if (selectedFlightPath && markers.has(selectedFlightPath.flightId)) {
    markers.get(selectedFlightPath.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
  }
};

const unselectFlight = () => {
  resetIcon();

  if (selectedFlightPath) {
    const flightId = selectedFlightPath.flightId;
    
    // Disconnect from WebSocket if connected
    if (webSocketStore.isFlightConnected(flightId)) {
      webSocketStore.disconnectFlightPositionsWebSocket(radarService, flightId);
    }
    
    const flightToRemove = selectedFlightPath;
    selectedFlightPath = null; // Clear the reference first to prevent recursive cleanup
    flightToRemove.removeFlightPath();
    
    // Update stores
    mapStore.clearHighlight();
    flightStore.clearSelectedFlight();
  }
};

const removeMarker = (id: string) => {
  let marker = markers.get(id);

  if (marker) {
    if (selectedFlightPath && selectedFlightPath.flightId === id) {
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
  // Update position store
  positionStore.updatePositions(positions);
  
  positions.forEach((pos: TerrestialPosition, flightId: string) => {
    updateMarker(flightId, convertToHereCoords(pos, positions));
  });

  const now = new Date();

  // Purge stale markers
  for (let [key, value] of markers) {
    if (differenceInSeconds(now, value.lastUpdated) > positionStore.staleThreshold) {
      removeMarker(key);
    }
  }
  
  // Also purge stale positions from store
  positionStore.purgeStalePositions();
};


const updateSelectedFlightPath = async () => {
  // This function is kept for compatibility with the interval-based approach
  // but it's not actively used for WebSocket-connected flights
  if (selectedFlightPath && !webSocketStore.isFlightConnected(selectedFlightPath.flightId)) {
    try {
      const flightId = selectedFlightPath.flightId;
      radarService.getPositions(flightId).subscribe({
        next: (positions: TerrestialPosition[]) => {
          // Only update if the selected flight hasn't changed during the async call
          if (selectedFlightPath && selectedFlightPath.flightId === flightId && positions && positions.length > 0) {
            selectedFlightPath.updateFlightPath(positions);
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
    const previousFlight = selectedFlightPath;
    if (previousFlight && previousFlight.flightId !== flightId) {
      if (webSocketStore.isFlightConnected(previousFlight.flightId)) {
        webSocketStore.disconnectFlightPositionsWebSocket(radarService, previousFlight.flightId);
      }
      
      if (markers.has(previousFlight.flightId)) {
        markers.get(previousFlight.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
    }

    // Create the new flight path object before cleaning up the old one
    selectedFlightPath = new FlightPath(flightId, map);

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
      if (selectedFlightPath && selectedFlightPath.flightId === flightId && positions && positions.length > 0) {
        selectedFlightPath.updateFlightPath(positions);
      }
    };
    
    webSocketStore.registerFlightPositionsWebSocket(radarService, flightId, positionsCallback);
    
    // Update stores
    mapStore.highlightFlight(flightId);
    flightStore.selectFlight(flightId);
    
    // Initial positions will come through the WebSocket
  } catch (error) {
    console.error('Error setting up flight path:', error);
    // If there's an error, clean up current selection
    if (selectedFlightPath && selectedFlightPath.flightId === flightId) {
      const flightToRemove = selectedFlightPath;
      selectedFlightPath = null;
      flightToRemove.removeFlightPath();

      // Also reset the marker color since selection failed
      if (markers.has(flightId)) {
        markers.get(flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
      }
      
      if (webSocketStore.isFlightConnected(flightId)) {
        webSocketStore.disconnectFlightPositionsWebSocket(radarService, flightId);
      }
      
      // Clear stores
      mapStore.clearHighlight();
      flightStore.clearSelectedFlight();
    }
  }
};

const emitFlightId = (flightId: string) => {
  emit('onMarkerClicked', `${flightId}`);
};

const selectFlight = (flightId: string) => {
  // Reset color of previously selected aircraft if it exists and it's not the same as the newly selected one
  if (selectedFlightPath && selectedFlightPath.flightId !== flightId && markers.has(selectedFlightPath.flightId)) {
    markers.get(selectedFlightPath.flightId)?.setColor(AircraftIcon.INACTIVE_COLOR);
  }

  if (markers.has(flightId)) {
    markers.get(flightId)?.setColor(AircraftIcon.HIGHLIGHT_COLOR);
  }

  // Update stores
  mapStore.selectMarker(flightId);
  flightStore.selectFlight(flightId);
  mapStore.highlightFlight(flightId);

  addFlightPath(flightId);
  emitFlightId(flightId);
};

const initializeMap = () => {
  mapStore.setLoading(true);
  
  try {
    let defaultLayers = platform.createDefaultLayers();

    const mapContainer = document.getElementById('mapContainer');

    // Instantiate (and display) a map object:
    map = new H.Map(mapContainer, defaultLayers.vector.normal.map, {
      center: { lat: Number(props.lat) || mapStore.center.lat, lng: Number(props.lng) || mapStore.center.lng },
      zoom: mapStore.zoom,
      pixelRatio: window.devicePixelRatio || 1,
    });

    // provided that map was instantiated with the vector layer as a base layer
    let baseLayer = map.getBaseLayer();
    baseLayer.getProvider().setStyle(new H.map.Style(mapStore.config.styleUrl || '/radar-style.yml'));

    window.addEventListener('resize', () => {
      map.getViewPort().resize();
    });
    
    // Map events and behaviors
    new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    H.ui.UI.createDefault(map, defaultLayers);
    
    mapStore.setLoading(false);
    mapStore.clearError();
  } catch (error) {
    console.error('Error initializing map:', error);
    mapStore.setError(error as Error);
    mapStore.setLoading(false);
  }
};

defineExpose({ 
  unselectFlight,
  // Expose store access for parent components
  flightStore,
  positionStore,
  mapStore,
  webSocketStore
});
</script>

<style scoped></style>
