<template>
<div class="flLogEntry">

    <div class="silhouette" v-b-tooltip.hover.html.left="{ variant: 'dark' }" :title="operatorTooltip">
        <img :src="silhouetteUrl(aircraft.icaoType)" v-if="silhouetteUrl(aircraft.icaoType)" height="20px"/>
        <b-icon-question-square-fill v-if="!silhouetteUrl" width="75px"></b-icon-question-square-fill>
    </div>                
    <div class="callsign" v-if="flight.cls"><span class="badge badge-secondary">{{flight.cls}}</span></div>
    <div class="aircraftType">{{aircaftTypeTruncated}}</div>
    <div class="operator">{{aircaftOperatorTruncated}}</div>
    <router-link :to="{ name: 'flightview', params: { flightId: flight.id }}">
        <b-icon-check-circle v-if="!isLive" v-b-tooltip.hover.right :title="timestampTooltip" class="liveStatus"></b-icon-check-circle>
        <b-icon-star-fill v-if="isLive" v-b-tooltip.hover.right :title="timestampTooltip" class="liveStatus"></b-icon-star-fill>
    </router-link>
    
</div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Inject } from 'vue-property-decorator'
    import {BIconCheckCircle, BIconQuestionSquareFill, BIconStarFill} from 'bootstrap-vue'
    import { mixins } from 'vue-class-component'

    import {Aircraft, Flight} from '@/model/backendModel';
    import {AircraftIcon} from '@/mixins/aircraftIcon'
    import {FlightRadarService} from '@/services/flightRadarService';   
    
    import moment from 'moment';
    
    import _ from 'lodash'
    Vue.prototype._ = _;

    @Component({name: 'flight-log-entry'})
    export default class FlightLogEntry extends mixins(AircraftIcon) {

        @Prop() readonly flight!: Flight;

        @Inject('radarService') readonly frService!: FlightRadarService
        
        aircraft: Aircraft = {
            icao24: this.flight.icao24,
        };

        get operatorTooltip(): string {
            let tooltipContent =  `<strong>ICAO 24-bit: </strong> ${this.flight.icao24}`;
            if (this.aircraft.reg)
                tooltipContent += `<br><strong>Registration:</strong> ${this.aircraft.reg}`
            return tooltipContent;
        }

        get isLive(): boolean {
            const lastContact = moment(this.flight.lstCntct);
            return moment().diff(lastContact, 'minutes') < 5;
        }

        get timestampTooltip(): string {

            const lastContact = moment(this.flight.lstCntct);
            const firstContact = moment(this.flight.firstCntct);            

            let lastContactStr: string = this.getTimestampString(lastContact);
            let firstContactStr: string = this.getTimestampString(firstContact);

            return `first contact: ${firstContactStr}\nlast seen: ${lastContactStr}`;

            
        }

        private getTimestampString(timestamp: moment.Moment) : string {
            
            const hoursSinceMidnight = moment().startOf('day').diff(timestamp, 'hours');
            let timestmpStr: string = '';

            if (hoursSinceMidnight <= 0) {
                if (this.isLive)
                    timestmpStr = `${moment().diff(timestamp, 'minutes')} minutes ago`;
                else
                    timestmpStr = `Today, ${timestamp.format("HH:mm")}`;
            }     
            else if (hoursSinceMidnight > 0 && hoursSinceMidnight < 24) {
                timestmpStr = `Yesterday, ${timestamp.format("HH:mm")}`;
            }
            else {
                timestmpStr = timestamp.format("D.M.YYYY HH:mm")
            }

            return timestmpStr;
        }

        get aircaftOperatorTruncated(): string {
            return _.truncate(this.aircraft.op, {'length': 28});
        }

        get aircaftTypeTruncated(): string {
            return _.truncate(this.aircraft.type, {'length': 37});
        } 
        
        async mounted() {
            try {
                this.aircraft = await this.frService.getAircraft(this.flight.icao24);
            } 
            catch(err) {
                console.error(`Could not obtain details for ${this.flight.icao24}`);
            }            
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