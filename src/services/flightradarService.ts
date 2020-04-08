import {Flight, Aircraft} from '../model/backendModel'

export interface FlightRadarService {
 
    getFlights(numEntries: number): Promise<Array<Flight>>;

    getAircraft(icaoHexAddr: string): Promise<Aircraft>;

    getLivePositions(): any;


}