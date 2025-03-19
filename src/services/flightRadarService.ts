import { Flight, Aircraft, TerrestialPosition } from '@/model/backendModel';

export interface FlightRadarService {
  getFlights(numEntries: number, filter?: string): Promise<Array<Flight>>;

  getFlight(id: string): Promise<Flight>;

  getAircraft(icaoHexAddr: string): Promise<Aircraft>;

  // For compatibility - consider deprecating in favor of direct position access
  getAircaftPositions(): Promise<Map<string, TerrestialPosition>>;

  // WebSocket methods for live position data
  registerPositionsCallback(callback: (positions: Map<string, TerrestialPosition>) => void): void;
  disconnectPositionsWebSocket(): void;

  getCurrentPositions(): Map<string, TerrestialPosition>;

  getCurrentPosition(flightId: string): TerrestialPosition | null;

  getPositions(flightId: string): Promise<Array<TerrestialPosition>>;
}
