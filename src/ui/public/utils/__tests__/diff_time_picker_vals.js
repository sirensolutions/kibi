import moment from 'moment';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { UtilsDiffTimePickerValsProvider } from 'ui/utils/diff_time_picker_vals';

describe('Diff Time Picker Values', function () {
  let diffTimePickerValues;

  // kibi: $rootScope is added for 'sirenTimePrecision'
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    diffTimePickerValues = Private(UtilsDiffTimePickerValsProvider);
    $rootScope = _$rootScope_;
  }));

  it('accepts two undefined values', function () {
    const diff = diffTimePickerValues(undefined, undefined);
    expect(diff).to.be(false);
  });

  // kibi: added by kibi
  describe('kibi - time precision', function () {
    it('dateMath ranges with moment object', function () {
      const rangeA = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };
      const rangeB = {
        from: 'now-15m',
        to: 'now',
        mode: 'absolute'
      };

      expect(diffTimePickerValues(rangeA, rangeB)).to.be(true);
    });

    it('should not be equal', function () {
      const rangeAfrom = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };
      const rangeBfrom = {
        from: moment('2014-01-01T06:50:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };

      expect(diffTimePickerValues(rangeAfrom, rangeBfrom)).to.be(true);

      const rangeAto = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };
      const rangeBto = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:50:06.666Z'),
        mode: 'absolute'
      };

      expect(diffTimePickerValues(rangeAto, rangeBto)).to.be(true);
    });

    it('should be equal because of the precision', function () {
      $rootScope.sirenTimePrecision = 'h';

      const rangeAfrom = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };
      const rangeBfrom = {
        from: moment('2014-01-01T06:50:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };

      expect(diffTimePickerValues(rangeAfrom, rangeBfrom)).to.be(false);

      const rangeAto = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:06:06.666Z'),
        mode: 'absolute'
      };
      const rangeBto = {
        from: moment('2014-01-01T06:06:06.666Z'),
        to: moment('2015-01-01T06:50:06.666Z'),
        mode: 'absolute'
      };

      expect(diffTimePickerValues(rangeAto, rangeBto)).to.be(false);
    });
  });
  // kibi: end

  describe('dateMath ranges', function () {
    it('knows a match', function () {
      const diff = diffTimePickerValues(
        {
          to: 'now',
          from: 'now-7d'
        },
        {
          to: 'now',
          from: 'now-7d'
        }
      );

      expect(diff).to.be(false);
    });
    it('knows a difference', function () {
      const diff = diffTimePickerValues(
        {
          to: 'now',
          from: 'now-7d'
        },
        {
          to: 'now',
          from: 'now-1h'
        }
      );

      expect(diff).to.be(true);
    });
  });

  describe('a dateMath range, and a moment range', function () {
    it('is always different', function () {
      const diff = diffTimePickerValues(
        {
          to: moment(),
          from: moment()
        },
        {
          to: 'now',
          from: 'now-1h'
        }
      );

      expect(diff).to.be(true);
    });
  });

  describe('moment ranges', function () {
    it('uses the time value of moments for comparison', function () {
      const to = moment();
      const from = moment().add(1, 'day');

      const diff = diffTimePickerValues(
        {
          to: to.clone(),
          from: from.clone()
        },
        {
          to: to.clone(),
          from: from.clone()
        }
      );

      expect(diff).to.be(false);
    });

    it('fails if any to or from is different', function () {
      const to = moment();
      const from = moment().add(1, 'day');
      const from2 = moment().add(2, 'day');

      const diff = diffTimePickerValues(
        {
          to: to.clone(),
          from: from.clone()
        },
        {
          to: to.clone(),
          from: from2.clone()
        }
      );

      expect(diff).to.be(true);
    });
  });

  it('does not fall apart with unusual values', function () {
    const diff = diffTimePickerValues({}, {});
    expect(diff).to.be(false);
  });
});
