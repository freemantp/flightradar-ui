import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'
import {Flight, Aircraft} from '../model/backendModel'
import {API_BASEPATH,API_PASSWORD, API_USERNAME} from '../config'
import { FlightRadarService } from './flightradarService';

export class FlightRadarServiceImpl implements FlightRadarService {

    private config: AxiosRequestConfig = {
        auth: {
            username: API_USERNAME,
            password: API_PASSWORD
          }
    }
    public async getFlights(numEntries: number=10): Promise<Array<Flight>> {
        const res = await axios.get(`${API_BASEPATH}/flights?limit=${numEntries}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getFlight(id: string): Promise<Flight> {
        const res = await axios.get(`${API_BASEPATH}/flights/${id}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getAircraft(icaoHexAddr: string): Promise<Aircraft> {
        const res = await axios.get(`${API_BASEPATH}/aircraft/${icaoHexAddr}`, this.config);

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText;        
    }

    public async getLivePositions() {
        const res = await axios.get(`${API_BASEPATH}/positions/live`, this.config);        

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText; 
    }

    public async getPositions(flightid: string) {
        const res = await axios.get(`${API_BASEPATH}/flight/${flightid}/positions`, this.config);        

        if (this.is2xx(res))
            return res.data;
        else
          throw res.statusText; 
    }

    private is2xx(result: AxiosResponse<any>): boolean {
        return result.status >= 200 && result.status < 300;
    }

}