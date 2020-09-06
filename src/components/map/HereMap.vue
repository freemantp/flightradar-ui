<template>
     <div id="mapContainer" v-bind:style="{ width: width, height: height }"></div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Inject, Emit, Watch } from 'vue-property-decorator'
    import { FlightRadarService, FlightAndPosition } from '@/services/flightRadarService';
    import { TerrestialPosition } from '@/model/backendModel';
    import { FlightPath, HereCoordinates } from './flightPath'
    import { AircraftIcon, AircraftMarker } from './aircraftElements'

    import _ from 'lodash'
    import moment from 'moment';

    Vue.prototype._ = _;
    
    declare let H: any;

    @Component({name: 'here-map'})
    export default class HereMap extends Vue {

        @Prop(String) readonly lat!: string;
        @Prop(String) readonly lng!: string;
        @Prop(String) readonly width!: string;
        @Prop(String) readonly height!: string;
        @Prop(String) readonly apikey!: string;
        @Prop(Boolean) readonly pathVisible!: boolean;
        @Prop(Boolean) readonly liveMode!: boolean;
        @Prop(String) readonly flightId!: string;

        @Inject('radarService') readonly frService!: FlightRadarService

        private platform: any;
        private map: any;
        private behavior: any;
        
        private intervalId?: NodeJS.Timeout;
        private aircraftIcon: AircraftIcon|null = null;        
        private selectedFlight: FlightPath|null = null;

        private markers: Map<string, AircraftMarker> = new Map();
        private iconSvgMap: Map<string, any> = new Map();

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

        @Watch("flightId")
        async onflightIdChanged(val: string, oldVal: string) {    
           this.selectFlight(this.flightId);
        }

        private unselectFlight() {
            this.resetIcon();
            
            if(this.selectedFlight) {
                console.log('unselectFlight:' + this.selectedFlight.flightId)
                this.selectedFlight.removeFlightPath();
                this.selectedFlight = null;
            }            
        }

        public created() {

            this.platform = new H.service.Platform({
                apikey: this.apikey
            });

            this.aircraftIcon = new AircraftIcon(this.iconSvgMap);
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
                marker!.updatePosition(coords);

            } else {
                let marker = new AircraftMarker(id, coords, this.aircraftIcon!, this.map, this.iconSvgMap);
                marker.onPointerDown((event: any) => this.selectFlight(event.target.getData()));
                this.markers.set(id, marker);
            }        
        }

        private resetIcon() {
            if(this.selectedFlight && this.markers. has(this.selectedFlight.flightId)) {        
                this.markers.get(this.selectedFlight.flightId)!.setColor(AircraftIcon.INACTIVE_COLOR)       
            }
        }

        private selectFlight(flightId: string): void {
            console.log(`selected flight: ${flightId}`)
            this.unselectFlight();
            
            if(this.markers.has(flightId)) {
                this.markers.get(flightId)!.setColor(AircraftIcon.HIGHLIGHT_COLOR)
            }            

            this.selectedFlight = new FlightPath(flightId, this.map);

            this.addFlightPath(flightId);
            this.emitFlightId(flightId);            
        }

        private async loadLivePositions() {
            
            const positions = await this.frService.getLivePositions();
            this.updateAircraft(positions.values());
        }

        private static convertToHereCoords(flPos: FlightAndPosition): HereCoordinates {
            return {lat: Number(flPos.pos.lat), lng: Number(flPos.pos.lon), heading: flPos.pos.track} as HereCoordinates;
        }

        private async loadPositions(flightId: string) {            
            const positions = await this.frService.getPositions(flightId);
        }

        private updateAircraft(positions: IterableIterator<FlightAndPosition>) {

            for(let flPos of positions) {
                this.updateMarker(flPos.id, HereMap.convertToHereCoords(flPos));
            }

            const now = moment();

            // Purge stale markers
            for (let [key, value] of this.markers) {
                let currentTimestamp = moment(value.lastUpdated);
                if(now.diff(currentTimestamp,'seconds') > 15) {
                    
                    this.removeMarker(key);             
                }
            }            
        }

        private async addFlightPath(flightId: string) {            

            const positions: TerrestialPosition[] = await this.frService.getPositions(flightId);
            if(this.selectedFlight) {
                this.selectedFlight.createFlightPath(positions);
            }            
        }

        private async updateFlightPath(flightId: string) {

            const positions: TerrestialPosition[] = await this.frService.getPositions(flightId);
            if(this.selectedFlight) {
                this.selectedFlight.updateFlightPath(positions)
            }
        }

        private removeMarker(id: string): void {

            let marker = this.markers.get(id);

            if(marker) { 
                
                if(this.selectedFlight && this.selectedFlight.flightId === id) {
                    this.unselectFlight();
                }

                marker.remove();
                this.markers.delete(id);
                this.iconSvgMap.delete(id);

                console.log("deleted flight: " + id);
            }
        }

        public async mounted() {


            console.log("mount: "  + this.flightId)
            this.initializeMap();    
            this.map.setCenter({lat: this.lat, lng: this.lng});

            

            if(this.liveMode) {
                //TODO: stop update when navigating away
                this.intervalId = setInterval( () => {
                    this.loadLivePositions();
                    if(this.selectedFlight) {
                        this.updateFlightPath(this.selectedFlight.flightId);
                    }
                }, 1000);
            } else if (this.flightId) {
                this.selectFlight(this.flightId);
            }
        }

        beforeDestroy () {
            if(this.intervalId)
                clearInterval(this.intervalId);
        }
    }

</script>

<style scoped></style>