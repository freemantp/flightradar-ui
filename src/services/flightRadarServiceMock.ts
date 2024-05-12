/* eslint-disable @typescript-eslint/no-unused-vars */

import { FlightRadarService } from './flightRadarService';

import { Aircraft, Flight, TerrestialPosition } from '@/model/backendModel';

export class FlightRadarServiceMock implements FlightRadarService {
  private pos: TerrestialPosition[] = [
    { icao: '4b1617', callsign: 'SWR756C', lat: 47.02075, lon: 7.33998 },
    { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4429 },
    { icao: '440172', callsign: 'EJU4319', lat: 46.9149, lon: 7.4962 },
  ];

  getFlights(numEntries: number, filter?: string): Promise<Flight[]> {
    throw new Error('Method not implemented.');
  }
  getFlight(id: string): Promise<Flight> {
    return Promise.resolve({
      id: '123',
      icao24: 'ABCDEF',
      cls: 'RNG234',
      lstCntct: new Date(),
    } as Flight);
  }
  getAircraft(icaoHexAddr: string): Promise<Aircraft> {
    return Promise.resolve({
      icao24: 'ABCDEF',
      type: 'Pilatus PC-24',
      icaoType: 'PC24',
      reg: 'HB-MOCK',
      op: 'Pilatus Werke',
    } as Aircraft);
  }
  getLivePositions(): Promise<Map<string, TerrestialPosition>> {
    return Promise.resolve(
      new Map(
        Object.entries({
          987654: {
            icao: '0x2123',
            callsign: 'DUMMY',
            lat: 46.398228933748875,
            lon: 8.652085932337522,
          } as TerrestialPosition,
        })
      )
    );
  }
  getPositions(flightId: string): Promise<TerrestialPosition[]> {
    return Promise.resolve(this.pos);
  }
}
