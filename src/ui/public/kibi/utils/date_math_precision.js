import { contains } from 'lodash';
import dateMath from '@elastic/datemath';
import moment from 'moment';

/**
 * parseWithPrecision parses and rounds down the time string to the given precision
 */
export function parseWithPrecision(text, roundUp, precision) {
  const t = dateMath.parse(text, roundUp);

  roundWithPrecision(t, precision);
  return t;
}

/**
 * roundWithPrecision rounds the time to the given precision (seconds, minutes, ...).
 *
 * @param time a moment object
 * @param precision the precision as a string
 */
export function roundWithPrecision(time, precision) {
  if (precision && moment.isMoment(time)) {
    if (contains(dateMath.units, precision)) {
      return time.startOf(precision);
    } else {
      throw new Error('Wrong precision argument use one of ' + dateMath.units);
    }
  }
}

export * from '@elastic/datemath';
