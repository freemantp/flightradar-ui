import {FlightRadarService, FlightAndPosition}  from './flightRadarService';

import { Aircraft, Flight, TerrestialPosition } from '@/model/backendModel';

export class FlightRadarServiceMock implements FlightRadarService {

    private pos: TerrestialPosition[] = [
        {lat: 47.02075, lon: 7.33998},
        {lat: 46.81814, lon: 7.34101},
        {lat: 46.915023, lon: 7.496388}
    ]

    getFlights(numEntries: number): Promise<Flight[]> {
        throw new Error("Method not implemented.");
    }
    getFlight(id: string): Promise<Flight> {
        return Promise.resolve({ id: '123', icao24: 'ABCDEF', cls:'RNG234', lstCntct: new Date()} as Flight);
    }
    getAircraft(icaoHexAddr: string): Promise<Aircraft> {
        return Promise.resolve({    
            icao24: 'ABCDEF',
            type: 'Pilatus PC-24',
            icaoType: 'PC24',
            reg: 'HB-MOCK',
            op: 'Pilatus Werke'} as Aircraft)
    }
    getLivePositions(): Promise<Map<string, FlightAndPosition>> {

        return Promise.resolve(new Map(Object.entries({ 
            'ABCDEF': {
                id: '123',
                pos: this.pos[this.pos.length-1]
            } as FlightAndPosition
        })));
    }
    getPositions(flightId: string): Promise<TerrestialPosition[]> {
        return Promise.resolve(this.pos);
    }



}