import {Flight, Aircraft, TerrestialPosition} from '@/model/backendModel'

export interface FlightAndPosition {
    id: string;
    pos: TerrestialPosition;
}

export interface FlightRadarService {
 
    getFlights(numEntries: number, filter: string|null): Promise<Array<Flight>>;

    getFlight(id: string): Promise<Flight>;

    getAircraft(icaoHexAddr: string): Promise<Aircraft>;

    getLivePositions(): Promise<Map<string,FlightAndPosition>>;

    getPositions(flightId: string): Promise<Array<TerrestialPosition>>;


}