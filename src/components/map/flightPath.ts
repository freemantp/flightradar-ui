/* eslint-disable */
import { TerrestialPosition } from '@/model/backendModel';
import _ from 'lodash';

declare let H: any;

export interface HereCoordinates {
  lat: number;
  lng: number;
  heading: number;
}

export class FlightPath {
  private polyLine: any;

  constructor(private flightIdent: string, private map: any) {}

  public get flightId(): string {
    return this.flightIdent;
  }

  public createFlightPath(positions: TerrestialPosition[]) {
    this.removeFlightPath();

    if (positions.length > 1) {
      const lineString = new H.geo.LineString();
      positions.forEach((pos: TerrestialPosition) => {
        lineString.pushPoint({ lat: pos.lat, lng: pos.lon });
      });

      this.polyLine = this.map.addObject(new H.map.Polyline(lineString, { style: { lineWidth: 2, strokeColor: 'red' } }));
    } else {
      console.warn(`Not enough positions (${positions.length}) for flight ${this.flightIdent}`);
    }
  }

  public updateFlightPath(positions: TerrestialPosition[]) {
    if (this.polyLine) {
      const lineString = this.polyLine.getGeometry();

      if (lineString) {
        if (positions.length > 1 && positions.length > lineString.getPointCount()) {
          // TODO Check whether position is not equivalent to last point in line string
          _.forEach(_.slice(positions, lineString.getPointCount()), (pos: TerrestialPosition) => {
            lineString.pushPoint({ lat: pos.lat, lng: pos.lon });
          });

          if (this.polyLine) this.polyLine.setGeometry(lineString);
        }
      }
    }
  }

  public removeFlightPath(): void {
    if (this.polyLine) {
      console.log('removeFlightPath: ' + this.flightId);
      this.map.removeObject(this.polyLine);
      this.polyLine = null;
    }
  }
}
