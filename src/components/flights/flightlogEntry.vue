<template>
<div>
    {{icao24}} / {{callsign}} / {{lastContact}}
</div>
</template>

<script>
    import Vue from "vue";

    export default Vue.extend({
        name: "FlightLogEntry",
        props: {
            icao24: String,
            callsign: String,
            lastContact: Date
        }
    });
</script>

<style scoped></style>