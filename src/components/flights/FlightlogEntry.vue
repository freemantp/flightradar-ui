<template>
  <div class="flLogEntry">
    <div class="silhouette" data-bs-toggle="tooltip" data-bs-placement="left" data-bs-html="true" :data-bs-title="operatorTooltip">
      <img :src="silhouetteUrl(aircraft.icaoType)" v-if="aircraft.icaoType" height="20px" />
    </div>
    <div class="callsign" v-if="flight.cls">
      <span class="badge text-bg-secondary">{{ flight.cls }}</span>
    </div>
    <div class="aircraftType">{{ aircaftTypeTruncated }}</div>
    <div class="operator">{{ aircaftOperatorTruncated }}</div>
    <router-link :to="{ name: 'flightview', params: { flightId: flight.id } }">
      <i :class="[{ 'bi-airplane': isLive, 'bi-clouds': !isLive }, 'bi', 'liveStatus']"></i>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { Aircraft, Flight } from '@/model/backendModel';
import { FlightRadarService } from '@/services/flightRadarService';
import { silhouetteUrl } from '@/components/aircraftIcon';
import { computed, inject, onMounted, ref, PropType } from 'vue';
import _ from 'lodash';
import moment from 'moment';

const props = defineProps({
  flight: { type: Object as PropType<Flight>, required: true },
});

const frService = inject('frService') as FlightRadarService;

const aircraft = ref<Aircraft>({ icao24: '' });

onMounted(async () => {
  try {
    frService.getAircraft(props.flight.icao24).subscribe((ac) => {
      aircraft.value = ac;
    });
  } catch (err) {
    //console.debug(`Could not obtain details for ${props.flight.icao24}`);
  }
});

const operatorTooltip = computed(() => {
  let tooltipContent = `<strong>ICAO 24-bit: </strong> ${props.flight?.icao24?.toUpperCase()}<br/>`;
  if (aircraft.value.reg) tooltipContent += `<strong>Registration:</strong> ${aircraft.value.reg}<br/>`;
  tooltipContent += `${timestampTooltip.value}`;
  return tooltipContent;
});

const getTimestampString = (timestamp: moment.Moment): string => {
  const hoursSinceMidnight = moment().startOf('day').diff(timestamp, 'hours');
  let timestmpStr = '';

  if (hoursSinceMidnight <= 0) {
    const minutes = moment().diff(timestamp, 'minutes');

    if (isLive.value) {
      timestmpStr = minutes == 0 ? 'tracking' : `${minutes} minutes ago`;
    } else timestmpStr = `Today, ${timestamp.format('HH:mm')}`;
  } else if (hoursSinceMidnight > 0 && hoursSinceMidnight < 24) {
    timestmpStr = `Yesterday, ${timestamp.format('HH:mm')}`;
  } else {
    timestmpStr = timestamp.format('D.M.YYYY HH:mm');
  }

  return timestmpStr;
};

const timestampTooltip = computed(() => {
  const lastContact = moment(props.flight.lstCntct);
  const firstContact = moment(props.flight.firstCntct);

  const lastContactStr: string = getTimestampString(lastContact);
  const firstContactStr: string = getTimestampString(firstContact);

  let tooltip = `<i class="bi bi-radar"></i> ${lastContactStr}`;

  if (lastContactStr !== firstContactStr) {
    tooltip += `<br><i class="bi bi-box-arrow-in-right"></i> ${firstContactStr}`;
  }
  return tooltip;
});

const isLive = computed(() => {
  const lastContact = moment(props.flight.lstCntct);
  return moment().diff(lastContact, 'minutes') < 5;
});

const aircaftOperatorTruncated = computed(() => {
  return _.truncate(aircraft.value.op, { length: 28 });
});

const aircaftTypeTruncated = computed(() => {
  return _.truncate(aircraft.value.type, { length: 37 });
});
</script>

<style scoped>
.flLogEntry {
  font-size: 1.1em;
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
  top: 5px;
  right: 5px;
}
</style>
