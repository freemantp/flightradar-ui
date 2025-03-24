// This file contains elements for aircraft visualization
import moment from 'moment';
import { HereCoordinates } from './flightPath';

// Here Maps API interfaces
interface HereMarker {
  setGeometry(coords: HereCoordinates): void;
  addEventListener(event: string, callback: (event: { target: { getData(): string } }) => void): void;
  getData(): string;
}

// Just a type marker for the DOM icon, actual implementation is in the H namespace
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HereDomIcon {}

interface IconOptions {
  onAttach: (clonedElement: HTMLElement, domIcon: unknown, domMarker: { getData(): string }) => void;
  onDetach: (clonedElement: HTMLElement, domIcon: unknown, domMarker: { getData(): string }) => void;
}

declare let H: {
  map: {
    DomIcon: new (element: HTMLElement, options: IconOptions) => HereDomIcon;
    DomMarker: new (coords: HereCoordinates, options: { icon: HereDomIcon; data: string }) => HereMarker;
  };
};

export class AircraftIcon {
  private aircraftIcon: HereDomIcon;

  public static readonly INACTIVE_COLOR = '250, 255, 255';
  public static readonly HIGHLIGHT_COLOR = '250, 127, 0';

  constructor(private iconSvgMap: Map<string, SVGElement>) {
    const aircraftDomIconElement = document.createElement('div');

    // set the anchor using margin css property depending on the content's (svg element below) size
    // to make sure that the icon's center represents the marker's geo positon
    aircraftDomIconElement.style.margin = '-12px 0 0 -5px';

    aircraftDomIconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15px" height="20px">
                           <polygon points="0,20 7.5,12 15,20 7.5,0 0,20" fill="rgb(${AircraftIcon.INACTIVE_COLOR})" stroke="black" stroke-width="1" />
                           </svg>`;

    this.aircraftIcon = new H.map.DomIcon(aircraftDomIconElement, {
      onAttach: (clonedElement: HTMLElement, domIcon: unknown, domMarker: { getData(): string }) => {
        const clonedContent = clonedElement.getElementsByTagName('svg')[0];
        this.iconSvgMap.set(domMarker.getData(), clonedContent);
      },
      onDetach: (clonedElement: HTMLElement, domIcon: unknown, domMarker: { getData(): string }) => {
        if (this.iconSvgMap.has(domMarker.getData())) {
          this.iconSvgMap.delete(domMarker.getData());
        }
      },
    });
  }

  public get hereIcon() {
    return this.aircraftIcon;
  }
}

export class AircraftMarker {
  private marker: HereMarker;
  private lastUpdate: Date;

  constructor(
    private flightId: string,
    private coords: HereCoordinates,
    private aircraftIcon: AircraftIcon,
    private map: { addObject: (marker: HereMarker) => void; removeObject: (marker: HereMarker) => void },
    private iconSvgMap: Map<string, SVGElement>,
  ) {
    this.marker = new H.map.DomMarker(coords, { icon: this.aircraftIcon.hereIcon, data: flightId });
    this.map.addObject(this.marker);
    this.lastUpdate = moment().toDate();
  }

  public get hereMarker() {
    return this.marker;
  }

  public onPointerDown(callback: (event: { target: { getData(): string } }) => void) {
    this.marker.addEventListener('pointerdown', callback);
  }

  public updatePosition(coords: HereCoordinates) {
    this.marker.setGeometry(coords);

    if (this.iconSvgMap.has(this.flightId) && coords.heading != null) {
      const svgElement = this.iconSvgMap.get(this.flightId);
      if (svgElement) {
        svgElement.style.transform = 'rotate(' + coords.heading + 'deg)';
      }
    }

    this.lastUpdate = moment().toDate();
  }

  public remove() {
    this.map.removeObject(this.hereMarker);
  }

  public setColor(rgbString: string) {
    const iconSvg = this.iconSvgMap.get(this.flightId);
    if (iconSvg) {
      const polygon = iconSvg.getElementsByTagName('polygon')[0];
      if (polygon) {
        polygon.setAttribute('fill', `rgb(${rgbString})`);
      }
    }
  }

  public get lastUpdated(): Date {
    return this.lastUpdate;
  }
}
