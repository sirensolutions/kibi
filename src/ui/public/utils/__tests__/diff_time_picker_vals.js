let moment = require('moment');
let ngMock = require('ngMock');
let expect = require('expect.js');

describe('Diff Time Picker Values', function () {
  let diffTimePickerValues;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    $rootScope = _$rootScope_;
    diffTimePickerValues = Private(require('ui/utils/diff_time_picker_vals'));
  }));

  it('accepts two undefined values', function () {
    let diff = diffTimePickerValues(undefined, undefined);
    expect(diff).to.be(false);
  });

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
      $rootScope.kibiTimePrecision = 'h';

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

  describe('dateMath ranges', function () {
    it('knows a match', function () {
      let diff = diffTimePickerValues(
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
      let diff = diffTimePickerValues(
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
      let diff = diffTimePickerValues(
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
      let to = moment();
      let from = moment().add(1, 'day');

      let diff = diffTimePickerValues(
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
      let to = moment();
      let from = moment().add(1, 'day');
      let from2 = moment().add(2, 'day');

      let diff = diffTimePickerValues(
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
    let diff = diffTimePickerValues({}, {});
    expect(diff).to.be(false);
  });
});
