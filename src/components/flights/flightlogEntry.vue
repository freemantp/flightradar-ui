<template>
<div class="flLogEntry" v-b-tooltip.hover.html.left="{ variant: 'dark' }" :title="operatorTooltip" >

    <div class="silhouette"><img :src="silhouetteUrl" height="20px"/></div>                
    <div class="callsign" v-if="callsign"><span class="badge badge-secondary">{{callsign}}</span></div>
    <div class="aircraftType">{{aircraft.type}}</div>
    <div class="operator">{{aircaftOperatorTruncated}}</div>
  
    
    <!--<span>{{lastContact | moment("dddd HH:mm")ß}}</span>-->
  
</div>
</template>

<script lang="ts">
    import Vue from "vue";
    import Component from 'vue-class-component';
    import {Aircraft} from '../../model/backendModel';
    import { FlightRadarService } from '@/services/backendService';
    import _ from 'lodash'
    Vue.prototype._ = _;

const FlightLogEntryProps = Vue.extend({
  props: {
      icao24: String,
      callsign: String,
      lastContact: Date
  }
})

  @Component
  export default class FlightLogEntry extends FlightLogEntryProps {
    
    aircraft: Aircraft = {
        icao24: this.icao24,
    };

    get silhouetteUrl(): string {
    return this.aircraft.icaoType ?        
        `/silhouettes/${this.aircraft.icaoType.toLowerCase()}.png`:
        '';
    }


    get operatorTooltip(): string {
        return `<strong>Registration:</strong> ${this.aircraft.reg}<br>
                <strong>ModeS: </strong> ${this.icao24}`;

        this.aircraft.op + ' <br>ss';
    }

    get aircaftOperatorTruncated(): string {
        return _.truncate(this.aircraft.op, {'length': 28});
    }
    
    async mounted() {
      const frService = new FlightRadarService();
      this.aircraft = await frService.getAircraft(this.icao24);
      console.log(`Fetched flights` );
    }    
  }    
</script>

<style scoped>
.flLogEntry { 
    font-size:  1.1em;
    border-bottom: solid 1px #dadada; 
    max-width: 800px;
    height: 35px;
    position: relative;
    display: flex;
    align-items: center;
}

.silhouette {
    position: absolute;
    align-self: flex-start;
}

.callsign {
    position: absolute;
    left: 100px;
}

.aircraftType {
    position: absolute;
    left: 200px;
}

.operator {
    position: absolute;
    left: 540px;
}

</style>