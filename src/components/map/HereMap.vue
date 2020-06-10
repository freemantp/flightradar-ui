<template>
     <div id="mapContainer" v-bind:style="{ width: width, height: height }"></div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Inject, Emit, Watch } from 'vue-property-decorator'
    import { FlightRadarService, FlightAndPosition } from '@/services/flightRadarService';
    import { TerrestialPosition } from '@/model/backendModel';

    import _ from 'lodash'
    Vue.prototype._ = _;
    
    declare let H: any;

    export interface HereCoordinates {
        lat: number;
        lng: number;
    }

    @Component({name: 'here-map'})
    export default class HereMap extends Vue {

        @Prop(String) readonly appId!: string;
        @Prop(String) readonly appCode!: string;
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
        private markers: Map<string, any> = new Map();
        private orangeIcon: any;
        private intervalId?: NodeJS.Timeout;
        private polyLine: any;
        private selectedFlightId: string|null = null;

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
            this.selectedFlightId = null;
            this.removeFlightPath();
        }

        public created() {

            this.platform = new H.service.Platform({
                apikey: this.apikey
            });

            const orangeDot2 = `<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
                               <circle cx="5" cy="5" r="4" fill="rgb(250, 127, 0)" stroke-width="1" stroke="black" opacity="1"/>
                               </svg>`;


            this.orangeIcon = new H.map.Icon(orangeDot2, {anchor: {x: 5, y: 5}});
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
            } else {
                let marker = new H.map.Marker(coords, {icon: this.orangeIcon, data: id})
                marker.addEventListener('pointerdown', (event: any) => this.selectFlight(event.target.getData()));
                this.map.addObject(marker);                
                this.markers.set(id, marker);
            }        
        }

        private selectFlight(flightId: string): void {
            this.selectedFlightId = flightId;
            this.addFlightPath(flightId);
            this.emitFlightId(flightId);            
        }

        private async loadPositions() {
            
            const positions = await this.frService.getLivePositions();
            
            positions.forEach( (flPos, key) => {
                this.updateMarker(String(flPos.id), {lat: Number(flPos.pos.lat), lng: Number(flPos.pos.lon)} as HereCoordinates);
            });            
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

            var lineString = new H.geo.LineString();
            positions.forEach( (pos: TerrestialPosition) => {
                lineString.pushPoint({lat: pos.lat, lng:pos.lon});
            });

            this.polyLine = this.map.addObject(new H.map.Polyline(
                lineString, { style: { lineWidth: 2, strokeColor: 'red'}}
            ));
        }

        private async updateFlightPath(flightId: string) {

            if(this.polyLine) {

                
                let lineString = this.polyLine.getGeometry();

                if(lineString) {

                    const positions: TerrestialPosition[] = await this.frService.getPositions(flightId);

                    if(positions.length > lineString.getPointCount()) {
                        // TODO Check whether position is not equivalent to last point in line string
                        _.forEach(_.slice(positions, lineString.getPointCount()), (pos: TerrestialPosition)  => {
                            lineString.pushPoint({lat: pos.lat, lng:pos.lon});
                        })

                        this.polyLine.setGeometry(lineString);
                    }
                }

                
            }
        }

        private removeFlightPath(): void {
            if(this.polyLine) {
                this.map.removeObject(this.polyLine);
                this.polyLine = null;
            }
        }

        beforeDestroy () {
            if(this.intervalId)
                clearInterval(this.intervalId);
        }

    }

</script>

<style scoped></style>