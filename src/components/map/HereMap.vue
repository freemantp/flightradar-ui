<template>
     <div id="mapContainer" v-bind:style="{ width: width, height: height }"></div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Inject, Emit, Watch } from 'vue-property-decorator'
    import { FlightRadarService, FlightAndPosition } from '@/services/flightRadarService';
    import { TerrestialPosition } from '@/model/backendModel';

    import _ from 'lodash'
    import moment from 'moment';

    Vue.prototype._ = _;
    
    declare let H: any;

    export interface HereCoordinates {
        lat: number;
        lng: number;
        heading: number;
    }

    @Component({name: 'here-map'})
    export default class HereMap extends Vue {

        @Prop(String) readonly lat!: string;
        @Prop(String) readonly lng!: string;
        @Prop(String) readonly width!: string;
        @Prop(String) readonly height!: string;
        @Prop(String) readonly apikey!: string;
        @Prop(Boolean) readonly pathVisible!: boolean;

        @Inject('radarService') readonly frService!: FlightRadarService

        private platform: any;
        private map: any;
        private behavior: any;
        
        private aircraftIcon: any;
        private intervalId?: NodeJS.Timeout;
        private polyLine: any;
        private selectedFlightId: string|null = null;

        private markers: Map<string, any> = new Map();
        private lastUpdate: Map<string, Date> = new Map();
        private iconSvgMap: Map<string, any> = new Map();

        private static readonly INACTIVE_COLOR = "250, 255, 255";
        private static readonly HIGHLIGHT_COLOR = "250, 127, 0";

        @Emit('on-marker-clicked')
        emitFlightId(id: string): string {
            return `${id}`;
        }

        @Watch("pathVisible")
        async onPathVisibleChanged(val: string, oldVal: string) {    
            if(!val) {           
                this.unselectFlight();                
            }
        }

        private unselectFlight() {
            this.resetIcon();
            this.selectedFlightId = null;
            this.removeFlightPath();
        }

        public created() {

            this.platform = new H.service.Platform({
                apikey: this.apikey
            });

            let aircraftDomIconElement = document.createElement('div');

            // set the anchor using margin css property depending on the content's (svg element below) size
            // to make sure that the icon's center represents the marker's geo positon
            aircraftDomIconElement.style.margin = '-12px 0 0 -5px';

            aircraftDomIconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15px" height="20px">
                               <polygon points="0,20 7.5,12 15,20 7.5,0 0,20" fill="rgb(${HereMap.INACTIVE_COLOR})" stroke="black" stroke-width="1" />
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

        private initializeMap(): void {
           let defaultLayers = this.platform.createDefaultLayers();

           const mapContainer = document.getElementById('mapContainer');
            
            // Instantiate (and display) a map object:
            this.map = new H.Map(mapContainer,
                defaultLayers.vector.normal.map,{
                center: { lat: this.lat, lng: this.lng },
                zoom: 8,
                pixelRatio: window.devicePixelRatio || 1
            });        
            
            // provided that map was instantiated with the vector layer as a base layer
            let baseLayer = this.map.getBaseLayer();
            baseLayer.getProvider().setStyle(new H.map.Style('./radar-style.yml'));            

            window.addEventListener('resize', () => {
                this.map.getViewPort().resize();
            });

            this.behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));

            let ui = H.ui.UI.createDefault(this.map, defaultLayers);
        }

        private updateMarker(id: string, coords: HereCoordinates) {
            if(this.markers.has(id)) {

                let marker = this.markers.get(id);
                marker.setGeometry(coords);

                //TODO: if heading is not available, get it from last points of flight path
                if(this.iconSvgMap.has(id) && coords.heading != null) {                    
                    this.iconSvgMap.get(id).style.transform = 'rotate('+ coords.heading +'deg)';
                }

                this.lastUpdate.set(id, moment().toDate())

            } else {

                let marker = new H.map.DomMarker(coords, {icon: this.aircraftIcon, data: id})
                marker.addEventListener('pointerdown', (event: any) => this.selectFlight(event.target.getData()));
                this.map.addObject(marker);                
                this.markers.set(id, marker);
            }        
        }

        private resetIcon() {
            if(this.selectedFlightId) {                
                this.setMarkerColor(this.selectedFlightId, HereMap.INACTIVE_COLOR);
            }
        }

        private selectFlight(flightId: string): void {
            console.log(`selected flight: ${flightId}`)
            this.resetIcon();
            this.setMarkerColor(flightId, HereMap.HIGHLIGHT_COLOR);

            this.selectedFlightId = flightId;
            this.addFlightPath(flightId);
            this.emitFlightId(flightId);            
        }

        private setMarkerColor(flightId: string, rgbString: string) {
            let iconSvg = this.iconSvgMap.get(flightId);
            iconSvg.getElementsByTagName('polygon')[0].setAttribute("fill", `rgb(${rgbString}`);
        }

        private async loadPositions() {
            
            const positions = await this.frService.getLivePositions();
            
            function getRandomInt(min: number, max: number) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            
            this.updateAircraft(positions);
        }

        private updateAircraft(positions: Map<string,FlightAndPosition>) {
            positions.forEach( (flPos, key) => {
                this.updateMarker(String(flPos.id), {lat: Number(flPos.pos.lat), lng: Number(flPos.pos.lon), heading: flPos.pos.track} as HereCoordinates);
            });

            const now = moment();

            for (let [key, value] of this.lastUpdate) {
                let currentTimestamp = moment(value as unknown as Date);
                if(now.diff(currentTimestamp,'seconds') > 15) {
                    
                    this.removeMarker(key);                    
                    this.lastUpdate.delete(key);                    
                }
            }

            // Purge stale markers
        }

        public async mounted() {

            this.initializeMap();    
            this.map.setCenter({lat: '46.94825', lng: '7.42429'});

            //TODO: stop update when navigating away
            this.intervalId = setInterval( () => {
                this.loadPositions();
                if(this.selectedFlightId) {
                    this.updateFlightPath(this.selectedFlightId);
                }
            }, 1000)
        }

        private async addFlightPath(flightId: string) {

            this.removeFlightPath();

            const positions: TerrestialPosition[] = await this.frService.getPositions(flightId);

            if(positions.length > 1) {

                var lineString = new H.geo.LineString();
                positions.forEach( (pos: TerrestialPosition) => {
                    lineString.pushPoint({lat: pos.lat, lng:pos.lon});
                });

                this.polyLine = this.map.addObject(new H.map.Polyline(
                    lineString, { style: { lineWidth: 2, strokeColor: 'red'}}
                ));
            } else {
                console.warn(`Not enough positions (${positions.length}) for flight ${flightId}`)
            }
        }

        private async updateFlightPath(flightId: string) {

            if(this.polyLine) {
                
                let lineString = this.polyLine.getGeometry();

                if(lineString) {

                    const positions: TerrestialPosition[] = await this.frService.getPositions(flightId);

                    if(positions.length > 1 && positions.length > lineString.getPointCount()) {
                        // TODO Check whether position is not equivalent to last point in line string
                        _.forEach(_.slice(positions, lineString.getPointCount()), (pos: TerrestialPosition)  => {
                            lineString.pushPoint({lat: pos.lat, lng:pos.lon});
                        })

                        if(this.polyLine) 
                            this.polyLine.setGeometry(lineString);
                    }
                }                
            } 
        }

        private removeFlightPath(): void {
            if(this.polyLine) {
                console.log("removeFlightPath")
                this.map.removeObject(this.polyLine);
                this.polyLine = null;
            }
        }

        private removeMarker(id: string): void {

            let marker = this.markers.get(id);

            if(marker) { 
                
                if(this.selectedFlightId === id) {
                    this.unselectFlight();
                }

                this.map.removeObject(marker);
                this.markers.delete(id);
                this.iconSvgMap.delete(id);

                console.log("deleted flight: " + id);
            }
        }

        beforeDestroy () {
            if(this.intervalId)
                clearInterval(this.intervalId);
        }

    }

</script>

<style scoped></style>