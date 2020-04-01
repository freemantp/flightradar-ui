<template>
<div class="flLogEntry">

    <div class="silhouette" v-b-tooltip.hover.html.left="{ variant: 'dark' }" :title="operatorTooltip">
        <img :src="silhouetteUrl" v-if="silhouetteUrl" height="20px"/>
        <b-icon-question-square-fill v-if="!silhouetteUrl" width="75px"></b-icon-question-square-fill>
    </div>                
    <div class="callsign" v-if="callsign"><span class="badge badge-secondary">{{callsign}}</span></div>
    <div class="aircraftType">{{aircaftTypeTruncated}}</div>
    <div class="operator">{{aircaftOperatorTruncated}}</div>
    <b-icon-check-circle v-if="!isLive" v-b-tooltip.hover.right :title="timestampTooltip" class="liveStatus"></b-icon-check-circle>
    <b-icon-star-fill v-if="isLive" v-b-tooltip.hover.right :title="timestampTooltip" class="liveStatus"></b-icon-star-fill>
    
</div>
</template>

<script lang="ts">
    import Vue from "vue";
    import {BIconCheckCircle, BIconQuestionSquareFill, BIconStarFill} from 'bootstrap-vue'
    import Component from 'vue-class-component';
    import {Aircraft} from '../../model/backendModel';
    import {FlightRadarService} from '@/services/backendService';
    import _ from 'lodash'
    import moment from 'moment';
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
    
    get silhouetteUrl(): string|null {
        return this.aircraft.icaoType ?        
            `/silhouettes/${this.aircraft.icaoType.toLowerCase()}.png`:
            null;
    }

    get operatorTooltip(): string {
        let tooltipContent =  `<strong>ICAO 24-bit: </strong> ${this.icao24}`;
        if (this.aircraft.reg)
            tooltipContent += `<br><strong>Registration:</strong> ${this.aircraft.reg}`
        return tooltipContent;
    }

    get isLive(): boolean {
        const lastContact = moment(this.lastContact);
        return moment().diff(lastContact, 'minutes') < 5;
    }

    get timestampTooltip(): string {

        const lastContact = moment(this.lastContact);
        const hoursSinceMidnight = moment().startOf('day').diff(lastContact, 'hours');

        if (hoursSinceMidnight <= 0) {
            if (this.isLive)
                return `${moment().diff(lastContact, 'minutes')} minutes ago`;
            else
                return `Today, ${lastContact.format("HH:mm")}`;
        }     
        else if (hoursSinceMidnight > 0 && hoursSinceMidnight < 24)
            return `Yesterday, ${lastContact.format("HH:mm")}`;
        else 
            return lastContact.format("D.M.YYYY HH:mm")
    }

    get aircaftOperatorTruncated(): string {
        return _.truncate(this.aircraft.op, {'length': 28});
    }

    get aircaftTypeTruncated(): string {
        return _.truncate(this.aircraft.type, {'length': 37});
    } 
    
    async mounted() {
    const frService = new FlightRadarService();
    this.aircraft = await frService.getAircraft(this.icao24);
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

.liveStatus {
    position: absolute;
    right: 0px;
}

</style>