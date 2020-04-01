<template src="./hereMap.html"></template>

<script lang="ts">
    import Vue from "vue";
    import Component from 'vue-class-component';

    declare let H: any;

    const HereMapProps = Vue.extend({
        props: {
            appId: String,
            appCode: String,
            lat: String,
            lng: String,
            width: String,
            height: String,
            apikey: String
        }
    })

    export interface Coordinates {
        lat: string;
        lng: string;
    }

    @Component
    export default class HereMap extends HereMapProps {
    
        private platform: any;
        private map: any;
        private behavior: any;

        public orangeIcon: any;

        public constructor() {
            super();

            this.platform = new H.service.Platform({
                apikey: this.apikey
            });

            const orangeDot = `<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" width="10px" height="10px">
    <circle cx="5" cy="5" r="4" fill="rgb(250, 127, 0)" stroke-width="1" stroke="black" opacity="1"/>
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

        private addMarker(coords: Coordinates, icon: any) {

            
            let marker = new H.map.Marker(coords, {icon: this.orangeIcon})
            this.map.addObject(marker);
        }

        public mounted() {

            this.initializeMap();

            this.addMarker({lat: '46.94825', lng: '7.42429'} as Coordinates, this.orangeIcon);
            this.addMarker({lat: '47.13166', lng: '7.23498'} as Coordinates, this.orangeIcon);            

            this.map.setCenter({lat: '46.94825', lng: '7.42429'});
        }
    }

</script>

<style scoped></style>