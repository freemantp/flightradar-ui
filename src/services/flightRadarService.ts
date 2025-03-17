import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';

export interface FlightRadarService {
  getFlights(numEntries: number, filter?: string): Promise<Array<Flight>>;

  getFlight(id: string): Promise<Flight>;

  getAircraft(icaoHexAddr: string): Promise<Aircraft>;

  getAircaftPositions(): Promise<Map<string, TerrestialPosition>>;
  
  connectPositionsWebSocket(callback: (positions: Map<string, TerrestialPosition>) => void): void;
  
  disconnectPositionsWebSocket(): void;

  getPositions(flightId: string): Promise<Array<TerrestialPosition>>;
}
