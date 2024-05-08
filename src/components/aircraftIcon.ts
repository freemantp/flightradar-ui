import { toValue } from 'vue';
import _ from 'lodash';

export function silhouetteUrl(icaoTypeCode: string): string {
  const typeCode = toValue(icaoTypeCode);

  if (_.isEmpty(icaoTypeCode)) {
    return '';
  } else {
    return `/silhouettes/${typeCode.toLowerCase()}.png`;
  }
}
