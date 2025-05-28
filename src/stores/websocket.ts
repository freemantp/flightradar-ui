import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { TerrestialPosition } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { usePositionStore } from './position';

export interface WebSocketConnection {
  id: string;
  type: 'positions' | 'flight';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date | null;
  retryCount: number;
  maxRetries: number;
}

export const useWebSocketStore = defineStore('websocket', () => {
  // State
  const connections = ref<Map<string, WebSocketConnection>>(new Map());
  const flightCallbacks = ref<Map<string, (positions: TerrestialPosition[]) => void>>(new Map());
  const positionsCallback = ref<((positions: Map<string, TerrestialPosition>) => void) | null>(null);
  const reconnectAttempts = ref<Map<string, number>>(new Map());
  const maxRetryAttempts = ref<number>(5);
  const retryDelay = ref<number>(1000); // Base delay in ms
  const isAutoReconnectEnabled = ref<boolean>(true);

  // Getters
  const getAllConnections = computed(() => Array.from(connections.value.values()));
  
  const getActiveConnections = computed(() => 
    getAllConnections.value.filter(conn => conn.status === 'connected')
  );
  
  const getConnectionCount = computed(() => connections.value.size);
  
  const getActiveConnectionCount = computed(() => getActiveConnections.value.length);
  
  const isFlightConnected = computed(() => {
    return (flightId: string) => {
      const conn = connections.value.get(`flight-${flightId}`);
      return conn?.status === 'connected';
    };
  });
  
  const isPositionsConnected = computed(() => {
    const conn = connections.value.get('positions');
    return conn?.status === 'connected';
  });
  
  const getConnectionStatus = computed(() => {
    return (connectionId: string) => {
      return connections.value.get(connectionId)?.status || 'disconnected';
    };
  });

  const getConnectionStats = computed(() => {
    const total = connections.value.size;
    const connected = getActiveConnections.value.length;
    const connecting = getAllConnections.value.filter(c => c.status === 'connecting').length;
    const error = getAllConnections.value.filter(c => c.status === 'error').length;
    
    return {
      total,
      connected,
      connecting,
      error,
      disconnected: total - connected - connecting - error
    };
  });

  // Actions
  const createConnection = (id: string, type: 'positions' | 'flight'): WebSocketConnection => {
    const connection: WebSocketConnection = {
      id,
      type,
      status: 'connecting',
      lastActivity: new Date(),
      retryCount: 0,
      maxRetries: maxRetryAttempts.value
    };
    
    connections.value.set(id, connection);
    return connection;
  };

  const updateConnectionStatus = (
    connectionId: string, 
    status: WebSocketConnection['status'],
    resetRetryCount = false
  ) => {
    const connection = connections.value.get(connectionId);
    if (connection) {
      connection.status = status;
      connection.lastActivity = new Date();
      
      if (resetRetryCount) {
        connection.retryCount = 0;
        reconnectAttempts.value.delete(connectionId);
      }
    }
  };

  const incrementRetryCount = (connectionId: string): number => {
    const connection = connections.value.get(connectionId);
    if (connection) {
      connection.retryCount++;
      reconnectAttempts.value.set(connectionId, connection.retryCount);
      return connection.retryCount;
    }
    return 0;
  };

  const registerPositionsWebSocket = (
    radarService: FlightRadarService,
    callback: (positions: Map<string, TerrestialPosition>) => void
  ) => {
    const connectionId = 'positions';
    
    try {
      // Disconnect existing connection if any
      if (connections.value.has(connectionId)) {
        disconnectPositionsWebSocket(radarService);
      }
      
      createConnection(connectionId, 'positions');
      positionsCallback.value = callback;
      
      const positionStore = usePositionStore();
      
      // Wrapper callback that updates both store and component
      const wrappedCallback = (positions: Map<string, TerrestialPosition>) => {
        updateConnectionStatus(connectionId, 'connected', true);
        
        // Update position store
        positionStore.updatePositions(positions);
        positionStore.setConnectionStatus('connected');
        
        // Call component callback
        callback(positions);
      };
      
      radarService.registerPositionsCallback(wrappedCallback);
      updateConnectionStatus(connectionId, 'connected', true);
      
    } catch (error) {
      console.error('Failed to register positions websocket:', error);
      updateConnectionStatus(connectionId, 'error');
      
      // Auto-retry if enabled
      if (isAutoReconnectEnabled.value && incrementRetryCount(connectionId) <= maxRetryAttempts.value) {
        setTimeout(() => {
          registerPositionsWebSocket(radarService, callback);
        }, retryDelay.value * Math.pow(2, reconnectAttempts.value.get(connectionId) || 1));
      }
    }
  };

  const disconnectPositionsWebSocket = (radarService: FlightRadarService) => {
    const connectionId = 'positions';
    
    try {
      radarService.disconnectPositionsWebSocket();
      connections.value.delete(connectionId);
      positionsCallback.value = null;
      reconnectAttempts.value.delete(connectionId);
      
      const positionStore = usePositionStore();
      positionStore.setConnectionStatus('disconnected');
      
    } catch (error) {
      console.error('Failed to disconnect positions websocket:', error);
    }
  };

  const registerFlightPositionsWebSocket = (
    radarService: FlightRadarService,
    flightId: string,
    callback: (positions: TerrestialPosition[]) => void
  ) => {
    const connectionId = `flight-${flightId}`;
    
    try {
      // Disconnect existing connection for this flight if any
      if (connections.value.has(connectionId)) {
        disconnectFlightPositionsWebSocket(radarService, flightId);
      }
      
      createConnection(connectionId, 'flight');
      flightCallbacks.value.set(flightId, callback);
      
      const positionStore = usePositionStore();
      
      // Wrapper callback that updates both store and component
      const wrappedCallback = (positions: TerrestialPosition[]) => {
        updateConnectionStatus(connectionId, 'connected', true);
        
        // Update position store
        positionStore.updateFlightHistory(flightId, positions);
        
        // Call component callback
        callback(positions);
      };
      
      radarService.registerFlightPositionsCallback(flightId, wrappedCallback);
      updateConnectionStatus(connectionId, 'connected', true);
      
    } catch (error) {
      console.error(`Failed to register flight positions websocket for ${flightId}:`, error);
      updateConnectionStatus(connectionId, 'error');
      flightCallbacks.value.delete(flightId);
      
      // Auto-retry if enabled
      if (isAutoReconnectEnabled.value && incrementRetryCount(connectionId) <= maxRetryAttempts.value) {
        setTimeout(() => {
          registerFlightPositionsWebSocket(radarService, flightId, callback);
        }, retryDelay.value * Math.pow(2, reconnectAttempts.value.get(connectionId) || 1));
      }
    }
  };

  const disconnectFlightPositionsWebSocket = (radarService: FlightRadarService, flightId: string) => {
    const connectionId = `flight-${flightId}`;
    
    try {
      if (connections.value.has(connectionId)) {
        radarService.disconnectFlightPositionsWebSocket(flightId);
        connections.value.delete(connectionId);
        flightCallbacks.value.delete(flightId);
        reconnectAttempts.value.delete(connectionId);
      }
    } catch (error) {
      console.error(`Failed to disconnect flight positions websocket for ${flightId}:`, error);
    }
  };

  const disconnectAllWebSockets = (radarService: FlightRadarService) => {
    try {
      // Disconnect positions websocket
      disconnectPositionsWebSocket(radarService);
      
      // Disconnect all flight websockets
      const flightIds = Array.from(flightCallbacks.value.keys());
      flightIds.forEach(flightId => {
        disconnectFlightPositionsWebSocket(radarService, flightId);
      });
      
      // Clear all state
      connections.value.clear();
      flightCallbacks.value.clear();
      reconnectAttempts.value.clear();
      positionsCallback.value = null;
      
    } catch (error) {
      console.error('Failed to disconnect all websockets:', error);
    }
  };

  const reconnectWebSocket = (radarService: FlightRadarService, connectionId: string) => {
    const connection = connections.value.get(connectionId);
    if (!connection) return;
    
    if (connection.type === 'positions' && positionsCallback.value) {
      registerPositionsWebSocket(radarService, positionsCallback.value);
    } else if (connection.type === 'flight') {
      const flightId = connectionId.replace('flight-', '');
      const callback = flightCallbacks.value.get(flightId);
      if (callback) {
        registerFlightPositionsWebSocket(radarService, flightId, callback);
      }
    }
  };

  const reconnectAllWebSockets = (radarService: FlightRadarService) => {
    const connectionIds = Array.from(connections.value.keys());
    connectionIds.forEach(id => {
      const connection = connections.value.get(id);
      if (connection && connection.status !== 'connected') {
        reconnectWebSocket(radarService, id);
      }
    });
  };

  const setAutoReconnect = (enabled: boolean) => {
    isAutoReconnectEnabled.value = enabled;
  };

  const setMaxRetryAttempts = (attempts: number) => {
    maxRetryAttempts.value = Math.max(0, attempts);
  };

  const setRetryDelay = (delay: number) => {
    retryDelay.value = Math.max(100, delay);
  };

  const clearRetryAttempts = () => {
    reconnectAttempts.value.clear();
    connections.value.forEach(conn => {
      conn.retryCount = 0;
    });
  };

  // Reset store state
  const $reset = () => {
    connections.value.clear();
    flightCallbacks.value.clear();
    positionsCallback.value = null;
    reconnectAttempts.value.clear();
    maxRetryAttempts.value = 5;
    retryDelay.value = 1000;
    isAutoReconnectEnabled.value = true;
  };

  return {
    // State
    connections,
    flightCallbacks,
    positionsCallback,
    reconnectAttempts,
    maxRetryAttempts,
    retryDelay,
    isAutoReconnectEnabled,
    
    // Getters
    getAllConnections,
    getActiveConnections,
    getConnectionCount,
    getActiveConnectionCount,
    isFlightConnected,
    isPositionsConnected,
    getConnectionStatus,
    getConnectionStats,
    
    // Actions
    registerPositionsWebSocket,
    disconnectPositionsWebSocket,
    registerFlightPositionsWebSocket,
    disconnectFlightPositionsWebSocket,
    disconnectAllWebSockets,
    reconnectWebSocket,
    reconnectAllWebSockets,
    updateConnectionStatus,
    setAutoReconnect,
    setMaxRetryAttempts,
    setRetryDelay,
    clearRetryAttempts,
    $reset
  };
});