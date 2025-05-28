import { ref, onBeforeUnmount } from 'vue';
import { TerrestialPosition } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';

export interface WebSocketManager {
  // General positions websocket
  registerPositionsCallback: (callback: (positions: Map<string, TerrestialPosition>) => void) => void;
  disconnectPositionsWebSocket: () => void;
  
  // Flight-specific websockets
  registerFlightPositionsCallback: (flightId: string, callback: (positions: TerrestialPosition[]) => void) => void;
  disconnectFlightPositionsWebSocket: (flightId: string) => void;
  disconnectAllFlightWebSockets: () => void;
  
  // State management
  isFlightConnected: (flightId: string) => boolean;
  getConnectedFlights: () => string[];
}

export const webSocketManager = (radarService: FlightRadarService): WebSocketManager => {
  // Map to store flight position callbacks
  const flightPositionCallbacks = ref(new Map<string, (positions: TerrestialPosition[]) => void>());
  
  // General positions websocket management
  const registerPositionsCallback = (callback: (positions: Map<string, TerrestialPosition>) => void) => {
    try {
      radarService.registerPositionsCallback(callback);
    } catch (error) {
      console.error('Failed to register positions callback:', error);
    }
  };

  const disconnectPositionsWebSocket = () => {
    try {
      radarService.disconnectPositionsWebSocket();
    } catch (error) {
      console.error('Failed to disconnect positions websocket:', error);
    }
  };

  // Flight-specific websocket management
  const registerFlightPositionsCallback = (flightId: string, callback: (positions: TerrestialPosition[]) => void) => {
    try {
      // Disconnect previous callback for this flight if it exists
      if (flightPositionCallbacks.value.has(flightId)) {
        radarService.disconnectFlightPositionsWebSocket(flightId);
      }
      
      flightPositionCallbacks.value.set(flightId, callback);
      radarService.registerFlightPositionsCallback(flightId, callback);
    } catch (error) {
      console.error(`Failed to register flight positions callback for ${flightId}:`, error);
      // Clean up on error
      flightPositionCallbacks.value.delete(flightId);
    }
  };

  const disconnectFlightPositionsWebSocket = (flightId: string) => {
    try {
      if (flightPositionCallbacks.value.has(flightId)) {
        radarService.disconnectFlightPositionsWebSocket(flightId);
        flightPositionCallbacks.value.delete(flightId);
      }
    } catch (error) {
      console.error(`Failed to disconnect flight positions websocket for ${flightId}:`, error);
    }
  };

  const disconnectAllFlightWebSockets = () => {
    try {
      for (const flightId of flightPositionCallbacks.value.keys()) {
        radarService.disconnectFlightPositionsWebSocket(flightId);
      }
      flightPositionCallbacks.value.clear();
    } catch (error) {
      console.error('Failed to disconnect all flight websockets:', error);
    }
  };

  // State management helpers
  const isFlightConnected = (flightId: string): boolean => {
    return flightPositionCallbacks.value.has(flightId);
  };

  const getConnectedFlights = (): string[] => {
    return Array.from(flightPositionCallbacks.value.keys());
  };

  // Cleanup on component unmount
  onBeforeUnmount(() => {
    disconnectPositionsWebSocket();
    disconnectAllFlightWebSockets();
  });

  return {
    registerPositionsCallback,
    disconnectPositionsWebSocket,
    registerFlightPositionsCallback,
    disconnectFlightPositionsWebSocket,
    disconnectAllFlightWebSockets,
    isFlightConnected,
    getConnectedFlights
  };
};