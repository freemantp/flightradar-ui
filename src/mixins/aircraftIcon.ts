// mixins.js
import Vue from 'vue'
import Component from 'vue-class-component'

@Component
export class AircraftIcon extends Vue {

    silhouetteUrl(icaoTypeCode: string): string|null {
        return icaoTypeCode ?        
            `/silhouettes/${icaoTypeCode.toLowerCase()}.png`:
            null;
    }

}
