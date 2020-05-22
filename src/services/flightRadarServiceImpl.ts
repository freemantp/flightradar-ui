import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'
import {Flight, Aircraft, TerrestialPosition} from '@/model/backendModel'
import {Configuration} from '@/config'
import {FlightRadarService, FlightAndPosition}  from './flightRadarService';

import _ from 'lodash'

export class FlightRadarServiceImpl implements FlightRadarService {

    private config: AxiosRequestConfig; 
    private apiBasepath: string;

    constructor() {        
        this.config = Configuration.value('flightApiUser') ? {
            auth: {
                username: Configuration.value('flightApiUser'),
                password: Configuration.value('flightApiPassword')
            } 
        } as AxiosRequestConfig : { }

       let basePath = Configuration.value('flightApiUrl');

        if(basePath) {
            this.apiBasepath = basePath;
        } else {
            throw 'Flight API URL not defined';
        }        
    } 

    public async getFlights(numEntries: number=10): Promise<Array<Flight>> {
        const res = await axios.get(`${this.apiBasepath}/flights?limit=${numEntries}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getFlight(id: string): Promise<Flight> {
        const res = await axios.get(`${this.apiBasepath}/flights/${id}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getAircraft(icaoHexAddr: string): Promise<Aircraft> {
        const res = await axios.get(`${this.apiBasepath}/aircraft/${icaoHexAddr}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getLivePositions(): Promise<Map<string,FlightAndPosition>>  {
        return axios.get(`${this.apiBasepath}/positions/live`, this.config)
            .then((res: AxiosResponse<Map<string,Array<number>>>) => {
                if (this.is2xx(res)) {
                    let vals: object = _.mapValues(res.data, (arr: any[]) => {
                        return {
                            id: arr[0],
                            pos: {lat: arr[1], lon: arr[2], alt: arr[3]} as TerrestialPosition

                        } as FlightAndPosition;                            
                    });
                    return new Map(Object.entries(vals));
                }
                else
                    throw res.statusText; 
                });
    }

    public async getPositions(flightid: string): Promise<Array<TerrestialPosition>> {

        return axios.get(`${this.apiBasepath}/flights/${flightid}/positions`, this.config)
             .then((res: AxiosResponse<Array<Array<Array<number>>>>) => {
                 
                if (this.is2xx(res)) {
                    return res.data[0].map((arr: Array<number>) => {
                        return {lat: arr[0], lon: arr[1], alt: arr[2]} as TerrestialPosition;
                    })
                }
                else
                    throw res.statusText; 
                });
    }

    private is2xx(result: AxiosResponse<any>): boolean {
        return result.status >= 200 && result.status < 300;
    }

}