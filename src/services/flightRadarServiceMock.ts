/* eslint-disable @typescript-eslint/no-unused-vars */

import { FlightRadarService } from './flightRadarService';

import { Aircraft, Flight, TerrestialPosition } from '@/model/backendModel';

export class FlightRadarServiceMock implements FlightRadarService {
  private pos: TerrestialPosition[] = [
    { icao: '4b1617', callsign: 'SWR756C', lat: 47.02075, lon: 7.33998, track: 45, alt: 35000 },
    { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4429, track: 90, alt: 30000 },
    { icao: '440172', callsign: 'EJU4319', lat: 46.9149, lon: 7.4962, track: 180, alt: 25000 },
    { icao: 'a1b2c3', callsign: 'BAW123', lat: 47.12075, lon: 7.45998, track: 270, alt: 20000 },
    { icao: 'd4e5f6', callsign: 'KLM456', lat: 46.95185, lon: 7.3629, track: 359, alt: 15000 },
  ];

  getFlights(numEntries: number, filter?: string): Promise<Flight[]> {
    // Generate mock flights
    const flights: Flight[] = [
      {
        id: '123456',
        icao24: '4b1617',
        cls: 'SWR756',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        id: '234567',
        icao24: '76ceef',
        cls: 'SIA346',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 7200000), // 2 hours ago
      },
      {
        id: '345678',
        icao24: '440172',
        cls: 'EJU4319',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 1800000), // 30 minutes ago
      },
      {
        id: '456789',
        icao24: 'a1b2c3',
        cls: 'BAW123',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 5400000), // 1.5 hours ago
      },
      {
        id: '567890',
        icao24: 'd4e5f6',
        cls: 'KLM456',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 900000), // 15 minutes ago
      },
    ];

    // Apply filter if specified
    if (filter === 'mil') {
      // Just return an empty list for mock data with military filter
      return Promise.resolve([]);
    }

    // Limit the number of entries as requested
    return Promise.resolve(flights.slice(0, numEntries));
  }
  getFlight(id: string): Promise<Flight> {
    // Mock flights by ID
    const flightMap: Record<string, Flight> = {
      '123456': {
        id: '123456',
        icao24: '4b1617',
        cls: 'SWR756',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 3600000), // 1 hour ago
      },
      '234567': {
        id: '234567',
        icao24: '76ceef',
        cls: 'SIA346',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 7200000), // 2 hours ago
      },
      '345678': {
        id: '345678',
        icao24: '440172',
        cls: 'EJU4319',
        lstCntct: new Date(),
        firstCntct: new Date(Date.now() - 1800000), // 30 minutes ago
      },
    };

    // Return the requested flight or a default
    return Promise.resolve(
      flightMap[id] ||
        ({
          id: id,
          icao24: 'ABCDEF',
          cls: 'MOCK' + id,
          lstCntct: new Date(),
          firstCntct: new Date(Date.now() - 3600000),
        } as Flight),
    );
  }

  getAircraft(icaoHexAddr: string): Promise<Aircraft> {
    // Mock aircraft data by ICAO address
    const aircraftMap: Record<string, Aircraft> = {
      '4b1617': {
        icao24: '4b1617',
        type: 'Airbus A320-214',
        icaoType: 'A320',
        reg: 'HB-JLT',
        op: 'Swiss International Air Lines',
      },
      '76ceef': {
        icao24: '76ceef',
        type: 'Boeing 777-312/ER',
        icaoType: 'B77W',
        reg: '9V-SWL',
        op: 'Singapore Airlines',
      },
      '440172': {
        icao24: '440172',
        type: 'Airbus A319-111',
        icaoType: 'A319',
        reg: 'G-EZBD',
        op: 'easyJet UK',
      },
    };

    // Return the requested aircraft or a default
    return Promise.resolve(
      aircraftMap[icaoHexAddr] ||
        ({
          icao24: icaoHexAddr,
          type: 'Mock Aircraft',
          icaoType: 'MOCK',
          reg: 'REG-' + icaoHexAddr.toUpperCase(),
          op: 'Mock Airlines',
        } as Aircraft),
    );
  }
  getAircaftPositions(): Promise<Map<string, TerrestialPosition>> {
    // Create a new map with realistic positions and rotate to simulate movement
    const result = new Map<string, TerrestialPosition>();

    // Add live positions for different flights
    result.set('123456', {
      icao: '4b1617',
      callsign: 'SWR756C',
      lat: 47.02075 + Math.random() * 0.01,
      lon: 7.33998 + Math.random() * 0.01,
      track: 45 + Math.random() * 10,
      alt: 35000,
    });

    result.set('234567', {
      icao: '76ceef',
      callsign: 'SIA346',
      lat: 46.96185 + Math.random() * 0.01,
      lon: 7.4429 + Math.random() * 0.01,
      track: 90 + Math.random() * 10,
      alt: 30000,
    });

    result.set('345678', {
      icao: '440172',
      callsign: 'EJU4319',
      lat: 46.9149 + Math.random() * 0.01,
      lon: 7.4962 + Math.random() * 0.01,
      track: 180 + Math.random() * 10,
      alt: 25000,
    });

    result.set('456789', {
      icao: 'a1b2c3',
      callsign: 'BAW123',
      lat: 47.12075 + Math.random() * 0.01,
      lon: 7.45998 + Math.random() * 0.01,
      track: 270 + Math.random() * 10,
      alt: 20000,
    });

    return Promise.resolve(result);
  }

  getPositions(flightId: string): Promise<TerrestialPosition[]> {
    // Create flight paths with multiple points
    const flightPaths: Record<string, TerrestialPosition[]> = {
      '123456': [
        { icao: '4b1617', callsign: 'SWR756C', lat: 47.02075, lon: 7.33998, track: 45, alt: 35000 },
        { icao: '4b1617', callsign: 'SWR756C', lat: 47.03075, lon: 7.34998, track: 45, alt: 35000 },
        { icao: '4b1617', callsign: 'SWR756C', lat: 47.04075, lon: 7.35998, track: 45, alt: 35000 },
        { icao: '4b1617', callsign: 'SWR756C', lat: 47.05075, lon: 7.36998, track: 45, alt: 35000 },
        { icao: '4b1617', callsign: 'SWR756C', lat: 47.06075, lon: 7.37998, track: 45, alt: 35000 },
      ],
      '234567': [
        { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4429, track: 90, alt: 30000 },
        { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4529, track: 90, alt: 30000 },
        { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4629, track: 90, alt: 30000 },
        { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4729, track: 90, alt: 30000 },
        { icao: '76ceef', callsign: 'SIA346', lat: 46.96185, lon: 7.4829, track: 90, alt: 30000 },
      ],
    };

    // Return specific flight path or default
    return Promise.resolve(flightPaths[flightId] || this.pos);
  }
}
