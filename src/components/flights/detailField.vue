<template>
  <div style="position: relative; height: 45px;">
    <div class="labelText">{{label}}</div>
    <div class="valueText">{{textTruncated}}</div>
    <img class="valueText"
      :src="imageUrl"
      v-if="imageUrl"
      height="20px"/>    
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import _ from 'lodash'

Vue.prototype._ = _;

@Component({
   name: 'detail-field',
})
export default class DetailField extends Vue {
  @Prop(String) readonly label!: string;
  @Prop(String) readonly text!: string;
  @Prop(String) readonly imageUrl!: string;

  get textTruncated(): string {
      return _.truncate(this.text, {'length': 42});
  }
}
</script>

<style scoped>
.labelText {
  font-size: 0.7em;
  text-transform: uppercase;
  color: rgb(100, 100, 100);
  position: absolute;
  top: 0px;
  left: 0px;
}

.valueText {
  font-size: 1em;
  position: absolute;
  top: 15px;
  left: 0px;
}
</style>