const numeral = require('numeral')();
import { isNumber } from 'lodash';

export function KibiHumanReadableHelperProvider() {

  class KibiHumanReadableHelper {

    formatNumber(count, format = '0.[0]a') {
      if (isNumber(count)) {
        return numeral.set(count).format(format);
      }
      return count;
    }

  }

  return new KibiHumanReadableHelper;
};
