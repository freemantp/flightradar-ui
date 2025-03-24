import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { FlightRadarService } from './services/flightRadarService';
import { FlightRadarServiceImpl } from './services/flightRadarServiceImpl';
import { FlightRadarServiceMock } from './services/flightRadarServiceMock';
import { Configuration } from './config';

// Choose the appropriate service implementation based on configuration
let baseService: FlightRadarService;

// Choose the appropriate service implementation
if (Configuration.isMockData()) {
  // Using mock data mode
  baseService = new FlightRadarServiceMock();
} else {
  // Using real API mode
  const frServiceImpl = new FlightRadarServiceImpl();
  frServiceImpl.connectWebsocket();
  baseService = frServiceImpl;
}

// Wrap the base service with the adapter to ensure compatibility
const frService = baseService;

// Create the Vue app
const app = createApp(App);

// Register the flight radar service as a global dependency
app.provide('frService', frService);

// Mount the app
app.use(router).mount('#app');
