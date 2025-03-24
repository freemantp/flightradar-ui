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
    lineDash?: number[];
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
  private pathSegments: HerePolyline[] = [];
  private readonly MAX_ALTITUDE = 50000; // Maximum altitude in feet
  private readonly LARGE_GAP_THRESHOLD = 5; // Threshold in nautical miles
  private readonly EARTH_RADIUS_NM = 3440.065; // Earth radius in nautical miles
  private readonly MEDIUM_GRAY_COLOR = '#505050'; // Medium gray color for large gaps

  constructor(
    private flightIdent: string,
    private map: { addObject: (obj: HerePolyline) => HerePolyline; removeObject: (obj: HerePolyline) => void },
  ) {}

  public get flightId(): string {
    return this.flightIdent;
  }

  /**
   * Calculate the great-circle distance between two points in nautical miles
   * using the Haversine formula
   * @param lat1 Latitude of first point in degrees
   * @param lon1 Longitude of first point in degrees
   * @param lat2 Latitude of second point in degrees
   * @param lon2 Longitude of second point in degrees
   * @returns Distance in nautical miles
   */
  private calculateDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Convert to radians
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lon1Rad = (lon1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const lon2Rad = (lon2 * Math.PI) / 180;

    // Haversine formula
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in nautical miles
    return this.EARTH_RADIUS_NM * c;
  }

  /**
   * Get color based on altitude - red (0 feet) to blue (50,000 feet)
   * @param altitude Altitude in feet
   * @returns Color in hex format
   */
  private getColorByAltitude(altitude = 0): string {
    // Clamp altitude between 0 and MAX_ALTITUDE
    const clampedAlt = Math.max(0, Math.min(altitude, this.MAX_ALTITUDE));
    // Calculate normalized ratio (0 to 1)
    const ratio = clampedAlt / this.MAX_ALTITUDE;

    // Red component decreases with altitude (255 to 0)
    const r = Math.round(255 * (1 - ratio));
    // Blue component increases with altitude (0 to 255)
    const b = Math.round(255 * ratio);
    // Green can be adjusted as needed - using 0 for a pure red-to-blue scale
    const g = 0;

    // Return hex color
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  public createFlightPath(positions: TerrestialPosition[]) {
    // Only create a new path if we have sufficient position data
    if (positions.length > 1) {
      // Clear any existing path first
      if (this.polyLine || this.pathSegments.length > 0) {
        this.removeFlightPath();
      }

      // Create segments between each pair of positions
      for (let i = 0; i < positions.length - 1; i++) {
        const currentPos = positions[i];
        const nextPos = positions[i + 1];

        // Calculate distance between points in nautical miles
        const distanceNM = this.calculateDistanceNM(currentPos.lat, currentPos.lon, nextPos.lat, nextPos.lon);

        // Determine if this is a large gap
        const isLargeGap = distanceNM >= this.LARGE_GAP_THRESHOLD;

        // Calculate average altitude for the segment
        const avgAltitude = ((currentPos.alt || 0) + (nextPos.alt || 0)) / 2;

        // Create line segment with color based on altitude or gray if large gap
        const lineString = new H.geo.LineString();
        lineString.pushPoint({ lat: currentPos.lat, lng: currentPos.lon });
        lineString.pushPoint({ lat: nextPos.lat, lng: nextPos.lon });

        // Configure style based on whether this is a large gap
        const style: PolylineOptions['style'] = {
          lineWidth: 3,
          strokeColor: isLargeGap ? this.MEDIUM_GRAY_COLOR : this.getColorByAltitude(avgAltitude),
          ...(isLargeGap ? { lineDash: [4, 4] } : {}), // 4px dash, 4px gap for large gaps
        };

        // Create and track the segment
        const segment = new H.map.Polyline(lineString, { style });

        // Add segment to map and track it
        this.map.addObject(segment);
        this.pathSegments.push(segment);
      }
    }
    // If there are not enough positions, we simply don't create a path
  }

  public updateFlightPath(positions: TerrestialPosition[]) {
    // We will recreate the flight path every time instead of appending
    // This ensures we don't have stale/duplicate position data
    if (positions.length > 1) {
      this.removeFlightPath(); // Clear all segments first
      this.createFlightPath(positions);
    }
  }

  public removeFlightPath(): void {
    // Remove all path segments
    this.pathSegments.forEach((segment) => {
      this.map.removeObject(segment);
    });
    this.pathSegments = [];

    if (this.polyLine) {
      this.map.removeObject(this.polyLine);
      this.polyLine = null;
    }
  }
}
