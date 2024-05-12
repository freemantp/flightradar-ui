import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';
import { Configuration } from '@/config';
import { FlightRadarService } from './flightRadarService';

import _ from 'lodash';

export class FlightRadarServiceImpl implements FlightRadarService {
  private config: AxiosRequestConfig;
  private apiBasepath: string;

  constructor() {
    this.config = Configuration.value('flightApiUser')
      ? ({
          auth: {
            username: Configuration.value('flightApiUser'),
            password: Configuration.value('flightApiPassword'),
          },
        } as AxiosRequestConfig)
      : {};

    const basePath = Configuration.value('flightApiUrl');

    if (basePath) {
      this.apiBasepath = basePath;
    } else {
      throw 'Flight API URL not defined';
    }
  }

  public async getFlights(numEntries: number, filter?: string): Promise<Array<Flight>> {
    const urlWithParams: string = filter == null ? `${this.apiBasepath}/flights?limit=${numEntries}` : `${this.apiBasepath}/flights?limit=${numEntries}&filter=${filter}`;

    const res = await axios.get(urlWithParams, this.config);

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getFlight(id: string): Promise<Flight> {
    const res = await axios.get(`${this.apiBasepath}/flights/${id}`, this.config);

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getAircraft(icaoHexAddr: string): Promise<Aircraft> {
    const res = await axios.get(`${this.apiBasepath}/aircraft/${icaoHexAddr}`, this.config);

    if (this.is2xx(res)) return res.data;
    else throw res.statusText;
  }

  public async getLivePositions(): Promise<Map<string, TerrestialPosition>> {
    return axios.get(`${this.apiBasepath}/positions/live`, this.config).then((res: AxiosResponse) => {
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
    return axios.get(`${this.apiBasepath}/flights/${flightid}/positions`, this.config).then((res: AxiosResponse<Array<Array<number>>>) => {
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
