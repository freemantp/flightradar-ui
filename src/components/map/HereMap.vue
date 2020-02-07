<template src="./hereMap.html"></template>

<script>
    export default {
        name: "HereMap",
        data() {
            return {
                map: {},
                platform: null
            }
        },
        props: {
            appId: String,
            appCode: String,
            lat: String,
            lng: String,
            width: String,
            height: String,
            apikey: String
        },
        created() {
            this.platform = new H.service.Platform({
                'apikey': this.apikey
            });
        },
        mounted() {

            let defaultLayers = this.platform.createDefaultLayers();
            
            // Instantiate (and display) a map object:
            this.map = new H.Map(
                document.getElementById('mapContainer'),
                defaultLayers.vector.normal.map,
                {
                    zoom:9 ,
                    center: { lat: this.lat, lng: this.lng },
                });                

            let behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));

            var svgMarkup = '<svg width="24" height="24" ' +
                'xmlns="http://www.w3.org/2000/svg">' +
                '<rect stroke="white" fill="#1b468d" x="1" y="1" width="22" ' +
                'height="22" /><text x="12" y="18" font-size="12pt" ' +
                'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
                'fill="white">H</text></svg>';
                            
            // Create an icon, an object holding the latitude and longitude, and a marker:
            var icon = new H.map.Icon(svgMarkup),
                coords = {lat: '46.94825', lng: '7.42429'},
                marker = new H.map.Marker(coords, {icon: icon});

            this.map.addObject(marker);


            window.addEventListener('resize', () => this.map.getViewPort().resize());


                // provided that map was instantiated with the vector layer
                // as a base layer
                var baseLayer = this.map.getBaseLayer();
                baseLayer.getProvider().setStyle(new H.map.Style('./radar-style.yml'));
        }
    }
</script>

<style scoped></style>