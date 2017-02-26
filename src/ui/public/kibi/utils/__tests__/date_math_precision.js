import { parseWithPrecision } from '../date_math_precision';
import _ from 'lodash';
import moment from 'moment';
import sinon from 'sinon';
import expect from 'expect.js';

describe('kibi - parse time with precision', function () {
  const spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y', 'ms'];
  const anchor =  '2014-01-01T06:06:06.666Z';
  const format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

  it('should round the time with the given precision', function () {
    _.each(spans, function (precision) {
      const expected = moment(anchor).startOf(precision).format(format);
      expect(parseWithPrecision(anchor, null, precision).format(format)).to.equal(expected);
      expect(parseWithPrecision(anchor, true, precision).format(format)).to.equal(expected);
    });
  });

  it('should throw error when wrong precision', function () {
    try {
      parseWithPrecision(anchor, null, 'WRONG');
      expect.fail('should fail');
    } catch (e) {
      expect(e.message).to.equal('Wrong precision argument use one of y,M,w,d,h,m,s,ms');
    }
  });

  it('should NOT throw an error when precision false or undefined', function () {
    const expected = moment(anchor).format(format);
    expect(parseWithPrecision(anchor).format(format)).to.equal(expected);
  });
});
