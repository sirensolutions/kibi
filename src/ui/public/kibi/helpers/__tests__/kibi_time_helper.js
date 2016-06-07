var expect = require('expect.js');
var ngMock = require('ngMock');

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var savedDashboards = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'Companies',
    title: 'Companies'
  },
  {
    id: 'time-testing-1',
    title: 'time testing 1',
    timeRestore: false
  },
  {
    id: 'time-testing-2',
    title: 'time testing 2',
    timeRestore: true,
    timeMode: 'quick',
    timeFrom: 'now-15y',
    timeTo: 'now'
  },
  {
    id: 'time-testing-3',
    title: 'time testing 3',
    timeRestore: true,
    timeMode: 'absolute',
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z'
  }
];
var datemath = require('ui/utils/dateMath');

var $rootScope;
var kibiTimeHelper;

function init(savedDashboards) {
  return function () {
    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
    });

    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      kibiTimeHelper = Private(require('ui/kibi/helpers/kibi_time_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('KibiTimeHelper', function () {
    beforeEach(init(savedDashboards));

    it('do not modify because dashboard timeRestore == false', function (done) {
      var dashboardId = 'time-testing-1';
      var timeRangeFilter = {
        range: {
          time_field: {
            gte: '967996747755',
            lte: '1441295947756'
          }
        }
      };

      kibiTimeHelper.updateTimeFilterForDashboard(dashboardId, timeRangeFilter).then(function (updatedTimeRangeFilter) {
        expect(updatedTimeRangeFilter).to.eql(timeRangeFilter);
        done();
      });
      $rootScope.$apply();
    });

    it('modify because dashboard timeRestore == true', function (done) {
      var dashboardId = 'time-testing-2';
      var timeRangeFilter = {
        range: {
          time_field: {
            gte: datemath.parse('now-10y').valueOf(),
            lte: datemath.parse('now-1y').valueOf()
          }
        }
      };

      var expected = {
        range: {
          time_field: {
            gte: datemath.parse('now-15y').valueOf(),  // here we expect now-15y and now
            lte: datemath.parse('now').valueOf()       // because dashboard time-testing-2 has these values
          }
        }
      };

      kibiTimeHelper.updateTimeFilterForDashboard(dashboardId, timeRangeFilter).then(function (updatedTimeRangeFilter) {
        var gteDiff = updatedTimeRangeFilter.range.time_field.gte - expected.range.time_field.gte;
        var lteDiff = updatedTimeRangeFilter.range.time_field.lte - expected.range.time_field.lte;
        // we give a margin as computing these values might take
        // few miliseconds on a busy test server
        expect(gteDiff).to.be.within(0, 50);
        expect(lteDiff).to.be.within(0, 50);
        done();
      });
      $rootScope.$apply();
    });
  });
});




