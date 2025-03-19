import Axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { CacheRequestConfig, setupCache, AxiosCacheInstance } from 'axios-cache-interceptor';
import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';
import { Configuration } from '@/config';
import { FlightRadarService } from './flightRadarService';

import _ from 'lodash';

export class FlightRadarServiceImpl implements FlightRadarService {
  private authConfig: AxiosRequestConfig;
  private apiBasepath: string;
  private axios: AxiosCacheInstance;
  private noCacheConfig: CacheRequestConfig;
  private oneSecondCacheConfig: CacheRequestConfig;
  private oneHourCacheConfig: CacheRequestConfig;
  private positionsWebSocket: WebSocket | null = null;
  private positionsData: Map<string, TerrestialPosition & { lastUpdate: number }> = new Map();
  private positionsCleanupInterval: number | null = null;

  constructor() {
    const instance = Axios.create();
    this.axios = setupCache(instance);

    this.authConfig = Configuration.value('flightApiUser')
      ? ({
          auth: {
            username: Configuration.value('flightApiUser'),
            password: Configuration.value('flightApiPassword'),
          },
        } as AxiosRequestConfig)
      : {};

    this.noCacheConfig = { cache: false };

    this.oneSecondCacheConfig = {
      cache: {
        ttl: 1000,
      },
    };

    this.oneHourCacheConfig = {
      cache: {
        ttl: 1000 * 60 * 60,
      },
    };

    const basePath = Configuration.value('flightApiUrl');

    if (basePath) {
      this.apiBasepath = basePath;
    } else {
      throw 'Flight API URL not defined';
    }
  }

  public async getFlights(numEntries: number, filter?: string): Promise<Array<Flight>> {
    const urlWithParams: string =
      filter == null ? `${this.apiBasepath}/flights?limit=${numEntries}` : `${this.apiBasepath}/flights?limit=${numEntries}&filter=${filter}`;

    const res = await this.axios.get(urlWithParams, _.assign({}, this.oneSecondCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw new Error(res.statusText || 'Error retrieving flights');
  }

  public async getFlight(id: string): Promise<Flight> {
    const res = await this.axios.get(`${this.apiBasepath}/flights/${id}`, _.assign({}, this.oneSecondCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw new Error(res.statusText || 'Error retrieving flight details');
  }

  public async getAircraft(icaoHexAddr: string): Promise<Aircraft> {
    const res = await this.axios.get(`${this.apiBasepath}/aircraft/${icaoHexAddr}`, _.assign({}, this.oneHourCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw new Error(res.statusText || 'Error retrieving aircraft details');
  }

  public async getAircaftPositions(): Promise<Map<string, TerrestialPosition>> {
    if (this.positionsData.size > 0) {
      return this.getCurrentPositions();
    }

    // If we don't have data yet, make sure WS is connected
    if (!this.positionsWebSocket) {
      // Create a promise that resolves when we get initial data
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for WebSocket data'));
        }, 5000); // 5 second timeout

        this.registerPositionsCallback((positions) => {
          clearTimeout(timeout);
          resolve(positions);
        });
      });
    }

    return new Map<string, TerrestialPosition>();
  }

  public getCurrentPositions(): Map<string, TerrestialPosition> {
    // Convert stored data (removing lastUpdate property)
    const result = new Map<string, TerrestialPosition>();
    this.positionsData.forEach((value, key) => {
      const { lastUpdate, ...position } = value;
      result.set(key, position);
    });
    return result;
  }

  public getCurrentPosition(flightId: string): TerrestialPosition | null {
    if (this.positionsData.has(flightId)) {
      const positionData = this.positionsData.get(flightId);
      if (positionData) {
        const { lastUpdate, ...position } = positionData;
        return position;
      }
    }
    return null;
  }

  public connectWebsocket(): WebSocket {
    const wsBaseUrl = this.getWebSocketBaseUrl();

    const finalWsUrl = wsBaseUrl + 'api/v1/ws/positions/live';
    console.log('Connecting to WebSocket:', finalWsUrl);

    this.positionsWebSocket = new WebSocket(finalWsUrl);

    this.positionsWebSocket.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.positionsWebSocket.onerror = (error) => {
      this.handleWebSocketFailure(error);
    };

    this.positionsWebSocket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      this.positionsWebSocket = null;

      // Clear any existing cleanup interval
      if (this.positionsCleanupInterval !== null) {
        window.clearInterval(this.positionsCleanupInterval);
        this.positionsCleanupInterval = null;
      }

      // Log a warning if not intentionally closed
      if (event.code !== 1000) {
        // 1000 is normal closure
        console.warn('WebSocket connection closed unexpectedly, WebSockets are required for position updates');
      }
    };

    return this.positionsWebSocket;
  }

  public registerPositionsCallback(callback: (positions: Map<string, TerrestialPosition>) => void): void {
    if (!this.positionsWebSocket) {
      throw new Error('WebSocket not connected');
    }

    try {
      this.positionsWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();

          if (data.positions) {
            // For 'initial' type, replace all position data
            if (data.type === 'initial') {
              this.positionsData.clear();

              // Process and store each position with timestamp
              Object.entries<TerrestialPosition>(data.positions).forEach(([id, pos]) => {
                const position = pos;
                if (position.track !== undefined) {
                  position.track = _.round(position.track);
                }
                this.positionsData.set(id, { ...position, lastUpdate: now });
              });
            }
            // For 'update' type, only update the specified positions
            else if (data.type === 'update') {
              Object.entries<Partial<TerrestialPosition>>(data.positions).forEach(([id, pos]) => {
                const deltaPosition = pos;

                // Handle both full and delta updates
                if (this.positionsData.has(id)) {
                  // Get existing data and merge with new data (delta update)
                  const existingData = this.positionsData.get(id);
                  if (!existingData) {
                    // This should never happen due to the has() check
                    return;
                  }
                  const { lastUpdate, ...existingPosition } = existingData;

                  // Merge the existing position with the delta update
                  const updatedPosition = {
                    ...existingPosition,
                    ...deltaPosition,
                  } as TerrestialPosition;

                  // Round track if it exists
                  if (updatedPosition.track !== undefined) {
                    updatedPosition.track = _.round(updatedPosition.track);
                  }

                  // Store updated position
                  this.positionsData.set(id, { ...updatedPosition, lastUpdate: now });
                } else {
                  // New position that wasn't in our data before
                  const position = pos as TerrestialPosition;
                  if (position.track !== undefined) {
                    position.track = _.round(position.track);
                  }
                  this.positionsData.set(id, { ...position, lastUpdate: now });
                }
              });
            }

            // Convert for callback (removing lastUpdate property)
            const result = new Map<string, TerrestialPosition>();
            this.positionsData.forEach((value, key) => {
              const { lastUpdate: _, ...position } = value;
              result.set(key, position);
            });

            // Send updated positions to callback
            callback(result);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      this.handleWebSocketFailure(error);
    }

    // Start cleanup interval to remove stale data
    if (this.positionsCleanupInterval === null) {
      this.positionsCleanupInterval = window.setInterval(() => {
        const now = Date.now();
        let hasRemovedData = false;

        // Remove positions not updated in the last 30 seconds
        this.positionsData.forEach((value, key) => {
          if (now - value.lastUpdate > 30000) {
            // 30 seconds
            this.positionsData.delete(key);
            hasRemovedData = true;
          }
        });

        // If we removed any data, send an update to the callback
        if (hasRemovedData) {
          const result = new Map<string, TerrestialPosition>();
          this.positionsData.forEach((value, key) => {
            const { lastUpdate: _, ...position } = value;
            result.set(key, position);
          });
          callback(result);
        }
      }, 5000); // Check every 5 seconds
    }
  }

  public disconnectPositionsWebSocket(): void {
    if (this.positionsWebSocket) {
      this.positionsWebSocket.close();
      this.positionsWebSocket = null;
    }

    if (this.positionsCleanupInterval !== null) {
      window.clearInterval(this.positionsCleanupInterval);
      this.positionsCleanupInterval = null;
    }

    // Clear stored positions
    this.positionsData.clear();
  }

  public async getPositions(flightid: string): Promise<Array<TerrestialPosition>> {
    const res = await this.axios.get(`${this.apiBasepath}/flights/${flightid}/positions`, _.assign({}, this.noCacheConfig, this.authConfig));

    if (this.is2xx(res)) {
      return res.data.map((arr: Array<number>) => {
        return {
          lat: arr[0],
          lon: arr[1],
          alt: arr[2],
        } as TerrestialPosition;
      });
    } else {
      throw new Error(res.statusText || 'Error retrieving flight positions');
    }
  }

  private handleWebSocketFailure(error: unknown): void {
    console.error('WebSocket error:', error);
    console.warn('WebSocket connection failed. Please ensure your backend supports WebSockets.');
    // No fallback to polling - WebSockets are required
  }

  private is2xx(result: AxiosResponse): boolean {
    return result.status >= 200 && result.status < 300;
  }

  private getWebSocketBaseUrl(): string {
    // Get the API URL
    const apiBaseUrl = this.apiBasepath;

    // If apiBaseUrl is not defined properly, log an error
    if (!apiBaseUrl) {
      throw new Error('Flight API URL not defined, WebSocket connection not established');
    }

    // Ensure apiBaseUrl ends with a slash for proper URL parsing
    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;

    // Convert http(s):// to ws(s)://
    // Split the URL into parts - this is more robust than URL parsing
    let wsUrl = '';

    if (baseUrl.startsWith('https://')) {
      wsUrl = 'wss://' + baseUrl.substring(8);
    } else if (baseUrl.startsWith('http://')) {
      wsUrl = 'ws://' + baseUrl.substring(7);
    } else {
      // If the URL doesn't start with http(s), assume it's a relative URL
      const isSecure = window.location.protocol === 'https:';
      wsUrl = (isSecure ? 'wss://' : 'ws://') + window.location.host + '/' + baseUrl;
    }

    // Remove 'api/v1/' if present in the base URL as it will be added to the ws path
    if (wsUrl.includes('api/v1/')) {
      wsUrl = wsUrl.replace('api/v1/', '');
    }

    return wsUrl;
  }
}
