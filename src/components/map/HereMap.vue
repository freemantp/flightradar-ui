<template>
     <div id="mapContainer" v-bind:style="{ width: width, height: height }"></div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Inject, Emit } from 'vue-property-decorator'
    import { FlightRadarService } from '@/services/flightradarService';
    
    declare let H: any;

    export interface Coordinates {
        lat: string;
        lng: string;
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

        @Inject('radarService') readonly frService!: FlightRadarService

        @Emit('on-marker-clicked')
        emitFlightId(id: string): string {
            return `${id}`;
        }
        
        private platform: any;
        private map: any;
        private behavior: any;
        private markers: Map<string, any> = new Map();
        public orangeIcon: any;
        private intervalId?: number;

        public created() {

            this.platform = new H.service.Platform({
                apikey: this.apikey
            });

            const orangeDot = `<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" width="20px" height="20px">
                               <circle cx="10" cy="10" r="5" fill="rgb(250, 127, 0)" stroke-width="1" stroke="black" opacity="1"/>
                               </svg>`;

            this.orangeIcon = new H.map.Icon(orangeDot);
        }

        private initializeMap(): void {
           let defaultLayers = this.platform.createDefaultLayers();

           const mapContainer = document.getElementById('mapContainer');
            
            // Instantiate (and display) a map object:
            this.map = new H.Map(mapContainer,
                defaultLayers.vector.normal.map,{
                center: { lat: this.lat, lng: this.lng },
                zoom: 9,
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

        private updateMarker(id: string, coords: Coordinates) {
            if(this.markers.has(id)) {
                let marker = this.markers.get(id);
                marker.setGeometry(coords);
            } else {
                let marker = new H.map.Marker(coords, {icon: this.orangeIcon, data: id})
                marker.addEventListener('tap', (event: any) => this.selectFlight(event.target.getData()));
                this.map.addObject(marker);                
                this.markers.set(id, marker);
            }        
        }

        private selectFlight(flightId: string): void {
            this.emitFlightId(flightId);
        }

        private async loadPositions() {
            
            const positions = await this.frService.getLivePositions();

            // this.updateMarker('12356', {lat: '47.18074', lng: '7.41438'} as Coordinates);
            // this.updateMarker('987654', {lat: '46.91235', lng: '7.49918'} as Coordinates);

            Object.keys(positions).forEach( (key) => {
                let pos: Array<any> = positions[key];
                this.updateMarker(<string>pos[0], {lat: pos[1], lng: pos[2]} as Coordinates);
            });            
        }

        public async mounted() {

            this.initializeMap();    
            this.map.setCenter({lat: '46.94825', lng: '7.42429'});

            //TODO: stop update when navigating away
            this.intervalId = setInterval( () => {
                this.loadPositions();
            }, 1000)
        }

        beforeDestroy () {
            clearInterval(this.intervalId);
        }

    }

</script>

<style scoped></style>