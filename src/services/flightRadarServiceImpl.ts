import Axios, { AxiosResponse, AxiosRequestConfig, AxiosInstance } from 'axios';
import { CacheRequestConfig, setupCache } from 'axios-cache-interceptor';
import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';
import { Configuration } from '@/config';
import { FlightRadarService } from './flightRadarService';

import _ from 'lodash';

export class FlightRadarServiceImpl implements FlightRadarService {
  private authConfig: AxiosRequestConfig;
  private apiBasepath: string;
  private axios: AxiosInstance;
  private noCacheConfig: CacheRequestConfig;
  private oneSecondCacheConfig: CacheRequestConfig;
  private oneHourCacheConfig: CacheRequestConfig;

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

    const res = await this.axios.get(urlWithParams, _.assign(this.oneSecondCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getFlight(id: string): Promise<Flight> {
    const res = await this.axios.get(`${this.apiBasepath}/flights/${id}`, _.assign(this.oneSecondCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getAircraft(icaoHexAddr: string): Promise<Aircraft> {
    const res = await this.axios.get(`${this.apiBasepath}/aircraft/${icaoHexAddr}`, _.assign(this.oneHourCacheConfig, this.authConfig));

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getAircaftPositions(): Promise<Map<string, TerrestialPosition>> {
    return this.axios.get(`${this.apiBasepath}/positions/live`, _.assign(this.noCacheConfig, this.authConfig)).then((res: AxiosResponse) => {
      if (this.is2xx(res)) {
        const vals: object = _.mapValues(res.data, (arr: TerrestialPosition) => {
          if (!_.isUndefined(arr.track)) {
            arr.track = _.round(arr.track);
          }
          return arr;
        });
        return new Map(Object.entries(vals));
      } else throw res.statusText;
    });
  }

  public async getPositions(flightid: string): Promise<Array<TerrestialPosition>> {
    return this.axios
      .get(`${this.apiBasepath}/flights/${flightid}/positions`, _.assign(this.noCacheConfig, this.authConfig))
      .then((res: AxiosResponse<Array<Array<number>>>) => {
        if (this.is2xx(res)) {
          return res.data.map((arr: Array<number>) => {
            return {
              lat: arr[0],
              lon: arr[1],
              alt: arr[2],
            } as TerrestialPosition;
          });
        } else throw res.statusText;
      });
  }

  private is2xx(result: AxiosResponse): boolean {
    return result.status >= 200 && result.status < 300;
  }
}
