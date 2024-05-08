import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';

export interface FlightRadarService {
  getFlights(numEntries: number, filter?: string): Promise<Array<Flight>>;

  getFlight(id: string): Promise<Flight>;

  getAircraft(icaoHexAddr: string): Promise<Aircraft>;

  getLivePositions(): Promise<Map<string, TerrestialPosition>>;

  getPositions(flightId: string): Promise<Array<TerrestialPosition>>;
}
