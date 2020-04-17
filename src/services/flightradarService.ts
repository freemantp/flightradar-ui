import {Flight, Aircraft} from '../model/backendModel'

export interface FlightRadarService {
 
    getFlights(numEntries: number): Promise<Array<Flight>>;

    getFlight(id: string): Promise<Flight>;

    getAircraft(icaoHexAddr: string): Promise<Aircraft>;

    getLivePositions(): any;


}