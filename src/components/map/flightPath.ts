// This file contains typing for the Here Maps API
import { TerrestialPosition } from '@/model/backendModel';

// Here Maps API interfaces
declare let H: {
  geo: {
    LineString: new () => HereLineString;
  };
  map: {
    Polyline: new (lineString: HereLineString, options: PolylineOptions) => HerePolyline;
    Object: {
      remove(): void;
    };
  };
};

interface HereLineString {
  pushPoint(point: { lat: number; lng: number }): void;
  getPointCount(): number;
}

interface PolylineOptions {
  style: {
    lineWidth: number;
    strokeColor: string;
  };
}

interface HerePolyline {
  getGeometry(): HereLineString;
  setGeometry(lineString: HereLineString): void;
}

export interface HereCoordinates {
  lat: number;
  lng: number;
  heading: number;
}

export class FlightPath {
  private polyLine: HerePolyline | null = null;

  constructor(
    private flightIdent: string,
    private map: { addObject: (obj: HerePolyline) => HerePolyline; removeObject: (obj: HerePolyline) => void },
  ) {}

  public get flightId(): string {
    return this.flightIdent;
  }

  public createFlightPath(positions: TerrestialPosition[]) {
    // Only create a new path if we have sufficient position data
    if (positions.length > 1) {
      // Clear any existing path first
      if (this.polyLine) {
        this.removeFlightPath();
      }

      const lineString = new H.geo.LineString();
      positions.forEach((pos: TerrestialPosition) => {
        lineString.pushPoint({ lat: pos.lat, lng: pos.lon });
      });

      this.polyLine = this.map.addObject(new H.map.Polyline(lineString, { style: { lineWidth: 2, strokeColor: 'red' } }));
    }
    // If there are not enough positions, we simply don't create a path
  }

  public updateFlightPath(positions: TerrestialPosition[]) {
    // We will recreate the flight path every time instead of appending
    // This ensures we don't have stale/duplicate position data
    if (positions.length > 1) {
      this.createFlightPath(positions);
    }
  }

  public removeFlightPath(): void {
    if (this.polyLine) {
      this.map.removeObject(this.polyLine);
      this.polyLine = null;
    }
  }
}
