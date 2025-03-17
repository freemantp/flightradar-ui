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
    const res = await this.axios.get(`${this.apiBasepath}/positions/live`, _.assign({}, this.noCacheConfig, this.authConfig));

    if (this.is2xx(res)) {
      const vals: object = _.mapValues(res.data, (arr: TerrestialPosition) => {
        if (arr.track !== undefined) {
          arr.track = _.round(arr.track);
        }
        return arr;
      });
      return new Map(Object.entries(vals));
    } else {
      throw new Error(res.statusText || 'Error retrieving aircraft positions');
    }
  }
  
  public connectPositionsWebSocket(callback: (positions: Map<string, TerrestialPosition>) => void): void {
    if (this.positionsWebSocket) {
      this.disconnectPositionsWebSocket();
    }
    
    // Convert http/https to ws/wss
    const apiUrl = new URL(this.apiBasepath);
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${apiUrl.host}/api/v1/ws/positions/live`;
    
    this.positionsWebSocket = new WebSocket(wsUrl);
    
    this.positionsWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = Date.now();
        
        if (data.positions) {
          // For 'initial' type, replace all position data
          if (data.type === 'initial') {
            this.positionsData.clear();
            
            // Process and store each position with timestamp
            Object.entries(data.positions).forEach(([id, pos]: [string, any]) => {
              const position = pos as TerrestialPosition;
              if (position.track !== undefined) {
                position.track = _.round(position.track);
              }
              this.positionsData.set(id, { ...position, lastUpdate: now });
            });
          } 
          // For 'update' type, only update the specified positions
          else if (data.type === 'update') {
            // Process and update each position with timestamp
            Object.entries(data.positions).forEach(([id, pos]: [string, any]) => {
              const deltaPosition = pos as Partial<TerrestialPosition>;
              
              // Handle both full and delta updates
              if (this.positionsData.has(id)) {
                // Get existing data and merge with new data (delta update)
                const existingData = this.positionsData.get(id)!;
                const { lastUpdate, ...existingPosition } = existingData;
                
                // Merge the existing position with the delta update
                const updatedPosition = { 
                  ...existingPosition,
                  ...deltaPosition
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
            const { lastUpdate, ...position } = value;
            result.set(key, position);
          });
          
          // Send updated positions to callback
          callback(result);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    this.positionsWebSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.positionsWebSocket.onclose = () => {
      this.positionsWebSocket = null;
      if (this.positionsCleanupInterval !== null) {
        window.clearInterval(this.positionsCleanupInterval);
        this.positionsCleanupInterval = null;
      }
    };
    
    // Start cleanup interval to remove stale data
    if (this.positionsCleanupInterval === null) {
      this.positionsCleanupInterval = window.setInterval(() => {
        const now = Date.now();
        let hasRemovedData = false;
        
        // Remove positions not updated in the last 30 seconds
        this.positionsData.forEach((value, key) => {
          if (now - value.lastUpdate > 30000) { // 30 seconds
            this.positionsData.delete(key);
            hasRemovedData = true;
          }
        });
        
        // If we removed any data, send an update to the callback
        if (hasRemovedData) {
          const result = new Map<string, TerrestialPosition>();
          this.positionsData.forEach((value, key) => {
            const { lastUpdate, ...position } = value;
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

  private is2xx(result: AxiosResponse): boolean {
    return result.status >= 200 && result.status < 300;
  }
}
