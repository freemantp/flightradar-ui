
declare let H: any;

import moment from 'moment';
import { HereCoordinates } from './flightPath'


export class AircraftIcon {

    private aircraftIcon: any;

    public static readonly INACTIVE_COLOR = "250, 255, 255";
    public static readonly HIGHLIGHT_COLOR = "250, 127, 0";

    constructor(private iconSvgMap: Map<string, any>) {
        
        let aircraftDomIconElement = document.createElement('div');

        // set the anchor using margin css property depending on the content's (svg element below) size
        // to make sure that the icon's center represents the marker's geo positon
        aircraftDomIconElement.style.margin = '-12px 0 0 -5px';

        aircraftDomIconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15px" height="20px">
                           <polygon points="0,20 7.5,12 15,20 7.5,0 0,20" fill="rgb(${AircraftIcon.INACTIVE_COLOR})" stroke="black" stroke-width="1" />
                           </svg>`;


        // const airplane = `<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
        //                     <path d="M 14.688294,3.772212 C 14.618882,3.7027996 14.53011,3.7094862 14.012321,3.949169 C 13.951206,3.977459 13.72742,4.1349729 13.72742,4.1349729 C 13.727421,4.1349736 13.611005,4.029175 13.582316,4.0004861 C 13.526851,3.945021 13.402386,3.9194626 13.304494,3.9420906 C 13.00078,4.0122908 11.789522,4.8589506 11.315503,5.3329689 C 11.021342,5.6271302 10.820389,5.7787831 10.738625,5.7682817 C 10.669626,5.7594203 10.372773,5.6479697 10.080346,5.5205427 C 9.5643695,5.2957031 9.4628688,5.2114829 6.6403088,2.6750816 C 4.4051045,0.66648791 3.6838134,0.051891521 3.5205658,0.015424733 C 3.0679259,-0.085685512 2.6474238,0.30598357 2.1226092,1.3178247 L 1.8518658,1.8398474 C 1.8518658,1.8398474 7.3021265,9.4525165 7.3021265,9.4525165 L 3.8355479,14.016225 L 3.6497445,13.911821 C 3.5479024,13.854145 2.9531527,13.37724 2.3278792,12.851851 C 1.7026037,12.326464 1.1318754,11.890663 1.0591003,11.883899 C 0.76653638,11.856708 -0.15366874,13.028191 0.0221356,13.203995 C 0.29961228,13.481472 1.1875748,14.645355 1.1971267,14.743517 C 1.2039453,14.813601 1.966833,15.81405 2.3066435,16.15386 C 2.6464539,16.493671 3.6469035,17.256558 3.7169871,17.263377 C 3.8151482,17.272929 4.9790317,18.160892 5.2565093,18.438369 C 5.4323137,18.614173 6.6037966,17.693968 6.5766045,17.401403 C 6.5698412,17.328628 6.1340403,16.757901 5.6086534,16.132625 C 5.0832647,15.507352 4.6063599,14.912602 4.5486828,14.810759 L 4.4442792,14.624956 L 9.0079874,11.158377 C 9.0079874,11.158377 16.620659,16.608638 16.620659,16.608639 L 17.142681,16.337894 C 18.154523,15.81308 18.546192,15.392578 18.445081,14.939938 C 18.408614,14.77669 17.79402,14.0554 15.785425,11.820195 C 13.249024,8.997635 13.164804,8.8961354 12.939964,8.3801608 C 12.812537,8.0877335 12.701088,7.7908815 12.692224,7.7218814 C 12.681724,7.6401179 12.833378,7.4391661 13.127538,7.1450037 C 13.601557,6.6709856 14.448216,5.4597269 14.518416,5.1560124 C 14.541044,5.0581203 14.515486,4.9336566 14.460021,4.8781908 C 14.431331,4.8495011 14.327303,4.7348555 14.327303,4.7348555 C 14.327303,4.7348555 14.484818,4.5110703 14.513107,4.4499556 C 14.752789,3.9321655 14.757708,3.8416259 14.688294,3.772212 z " fill="rgb(250, 127, 0)" />
        //                     </svg>`;
        

        this.aircraftIcon = new H.map.DomIcon(aircraftDomIconElement, {
            onAttach: (clonedElement: any, domIcon: any, domMarker: any) => {

                let clonedContent = clonedElement.getElementsByTagName('svg')[0];
                this.iconSvgMap.set(domMarker.getData(), clonedContent);
            },
            onDetach: (clonedElement: any, domIcon: any, domMarker: any) => {
                if(this.iconSvgMap.has(domMarker.getData())) {
                    this.iconSvgMap.delete(domMarker.getData());
                }
            }
        });
    }

    public get hereIcon() {
        return this.aircraftIcon;
    }
}

export class AircraftMarker {

    private marker: any;
    private lastUpdate: Date;

    constructor(private flightId: string, 
        private coords: HereCoordinates, 
        private aircraftIcon: AircraftIcon, 
        private map: any,
        private iconSvgMap: Map<string, any> 
        ) {                       
            this.marker = new H.map.DomMarker(coords, {icon: this.aircraftIcon!.hereIcon, data: flightId})
            this.map.addObject(this.marker);
            this.lastUpdate = moment().toDate();
    }

    public get hereMarker() {
        return this.marker;
    }

    public onPointerDown(callback: any) {
        this. marker.addEventListener('pointerdown', callback);
    }

    public updatePosition(coords: HereCoordinates) {

        this.marker.setGeometry(coords);

        //TODO: if heading is not available, get it from last points of flight path
        if(this.iconSvgMap.has(this.flightId) && coords.heading != null) {                    
            this.iconSvgMap.get(this.flightId).style.transform = 'rotate('+ coords.heading +'deg)';
        }

        this.lastUpdate = moment().toDate();
    }

    public remove() {
        this.map.removeObject(this.hereMarker);
    }

    public setColor(rgbString: string) {
        let iconSvg = this.iconSvgMap.get(this.flightId);
        iconSvg.getElementsByTagName('polygon')[0].setAttribute("fill", `rgb(${rgbString}`);
    }

    public get lastUpdated() : Date {
        return this.lastUpdate;
    }
}