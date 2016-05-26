var expect = require('expect.js');
var ngMock = require('ngMock');

var savedDashboards = require('fixtures/kibi/saved_dashboards');
var $rootScope;
var kibiStateHelper;
var globalState;
var $location;
var $timeout;

function init(savedDashboardsImpl, locationImpl) {
  return function () {
    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', savedDashboardsImpl);
    });

    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private, _$rootScope_, _globalState_, _$location_, _$timeout_) {
      $rootScope = _$rootScope_;
      globalState = _globalState_;
      $location = _$location_;
      $timeout = _$timeout_;
      kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('KibiStateHelper', function () {

    beforeEach(init(savedDashboards));

    it('is time for current dashboard is NOT updated when globalState time changed but we called destroy on the helper', function (done) {
      // first call destroy to make sure
      // state is not updated on save_with_changes
      kibiStateHelper.destroyHandlers();

      var dashboardWithTimeId = 'time-testing-2';
      var expected = {
        from: 'now-15y',
        to: 'now'
      };

      // now listen on save_with_changes which should be called only once
      var counter = 0;
      globalState.on('save_with_changes', function (diff) {
        if (diff.indexOf('k') !== -1) {
          counter++;
          expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expected);
        }
      });

      // now update global time
      globalState.time = {
        from: 'now-123',
        to: 'now-97'
      };
      globalState.save();

      $timeout.flush(); // kibiStateHelper uses the $timeout flush the queue of the $timeout service
      $rootScope.$apply();

      // after 250 ms check that save_with_changes was called only once and the time for dashboard did not changed
      setTimeout(function () {
        expect(counter).to.equal(2); // the second call comes from updating kibi_session
        expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expected);
        done();
      }, 100);
    });



    var dashboardId = 'Articles'; // existing one from fixtures/saved_dashboards

    it('save the selected dashboard in a group', function () {
      var groupId = 'group1';

      kibiStateHelper.saveSelectedDashboardId(groupId, dashboardId);
      expect(kibiStateHelper.getSelectedDashboardId(groupId)).to.equal(dashboardId);
    });

    it('save query for dashboard - analyze_wildcard: true', function () {

      var query1 = {
        query_string: {
          query: '*',
          analyze_wildcard: true
        }
      };

      kibiStateHelper.saveQueryForDashboardId(dashboardId, query1);
      expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query1);
    });

    it('save query for dashboard - analyze_wildcard: false', function () {

      var query2 = {
        query_string: {
          query: '*',
          analyze_wildcard: false
        }
      };

      kibiStateHelper.saveQueryForDashboardId(dashboardId, query2);
      expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query2);
    });

    it('save query for dashboard - analyze_wildcard: undefined', function () {

      var query3 = {
        query_string: {
          query: 'A'
        }
      };
      kibiStateHelper.saveQueryForDashboardId(dashboardId, query3);
      expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query3);
    });

    it('save query for dashboard - empty query', function () {

      var query4 = '';

      kibiStateHelper.saveQueryForDashboardId(dashboardId, query4);
      expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(undefined);
    });

    it('save filter for dashboard', function () {

      var filters = [{
      }];

      kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
      expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(filters);
    });

    it('save filter for dashboard - empty array', function () {

      var filters = [];

      kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
      expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(filters);
    });

    it('save filter for dashboard - filter == null', function () {
      var filters = null;
      var expected = [];
      kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
      expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(expected);
    });

    it('save filter for dashboard - dashboardId == null', function () {
      var filters = [{}, {}, {}];
      kibiStateHelper.saveFiltersForDashboardId(null, filters);
      expect(kibiStateHelper.getFiltersForDashboardId('null')).to.eql(undefined);
    });

    it('get filter for dashboard - where there are some global filters', function () {
      var expected = [{filter: 1}, {filter: 2}];
      globalState.filters = expected;
      globalState.save();

      expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(expected);
    });

    it('get filter for dashboard - where there are some local filters and global filters', function () {
      var filter1 = {filter: 1};
      var filter2 = {filter: 2};

      globalState.filters = [filter1];
      globalState.save();
      kibiStateHelper.saveFiltersForDashboardId(dashboardId, [filter2]);

      var actual = kibiStateHelper.getFiltersForDashboardId(dashboardId);
      expect(actual).to.contain(filter1);
      expect(actual).to.contain(filter2);
    });

    describe('get all filters for every dashboards', function () {
      it('should get all filters', function () {
        globalState.k = {
          d: {
            dashboard1: {
              f: [ { filter: 1 } ]
            },
            dashboard2: {
              f: [ { filter: 2 } ]
            }
          }
        };
        globalState.save();
        const expected = {
          dashboard1: [ { filter: 1 } ],
          dashboard2: [ { filter: 2 } ]
        };

        expect(kibiStateHelper.getAllFilters()).to.eql(expected);
      });

      it('should get all filters including pinned filters', function () {
        globalState.k = {
          d: {
            dashboard1: {
              f: [ { filter: 1 } ]
            },
            dashboard2: {
              f: [ { filter: 2 } ]
            }
          }
        };
        globalState.filters = [ { filter: 3 } ];
        globalState.save();
        const expected = {
          dashboard1: [ { filter: 1 }, { filter: 3 } ],
          dashboard2: [ { filter: 2 }, { filter: 3 } ]
        };

        expect(kibiStateHelper.getAllFilters()).to.eql(expected);
      });
    });

    it('save time filter for dashboard', function () {
      var from = 1;
      var to = 5;

      var expected = {
        from: from,
        to: to
      };

      kibiStateHelper.saveTimeForDashboardId(dashboardId, from, to);
      expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(expected);
    });

    it('remove time filter for dashboard', function () {
      var from = 1;
      var to = 5;

      var expected = {
        from: from,
        to: to
      };

      kibiStateHelper.saveTimeForDashboardId(dashboardId, from, to);
      expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(expected);
      kibiStateHelper.removeTimeForDashboardId(dashboardId);
      expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(null);
    });

    it('is updated when dashboard get saved', function (done) {
      var dashboardWithTimeId = 'time-testing-2';
      var expectedTime = {
        from: 'now-15y',   // taken from 'time-testing-2' saved dashboard
        to: 'now'
      };

      kibiStateHelper.removeTimeForDashboardId(dashboardWithTimeId);
      expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(null);
      $rootScope.$emit('kibi:dashboard:changed', dashboardWithTimeId);
      // here wait a bit as kibi state will be updated asynchronously
      globalState.on('save_with_changes', function (diff) {
        expect(diff).to.contain('k');
        expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expectedTime);
        done();
      });

      $rootScope.$apply();
    });


    it('is time for current dashboard updated when globalState time changed', function (done) {
      var dashboardWithTimeId = 'time-testing-2';
      var expectedTime = {
        from: 'now-123',
        to: 'now-97'
      };

      var counter = 0;
      globalState.on('save_with_changes', function (diff) {
        if (diff.indexOf('k') !== -1) {
          counter++;
          // get the second 'k' event
          if (counter === 2) {
            expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expectedTime);
            done();
          }
        }
      });


      $location.path('/dashboard/time-testing-2');
      globalState.time = expectedTime;
      globalState.save();

      $timeout.flush(); // kibiStateHelper uses the $timeout flush the queue of the $timeout service
      $rootScope.$apply();
    });




    it('should remove all filters', function () {
      var filters = [{filter: 1}, {filter: 2}];
      globalState.k = {
        d: {
          dashboard1: {
            f: filters
          },
          dashboard2: {
            f: filters
          }
        }
      };
      globalState.save();

      kibiStateHelper.removeAllFilters();

      expect(globalState.k.d.dashboard1.f).to.eql([]);
      expect(globalState.k.d.dashboard2.f).to.eql([]);
    });


    it('should remove all queries', function () {
      var query = {string_match: {}};
      globalState.k = {
        d: {
          dashboard1: {
            q: query
          },
          dashboard2: {
            q: query
          }
        }
      };
      globalState.save();

      kibiStateHelper.removeAllQueries();

      expect(globalState.k.d.dashboard1.q).to.eql('*');
      expect(globalState.k.d.dashboard2.q).to.eql('*');
    });

    it('should remove all filters of type', function () {
      var filters = [{join_set: {}}, {range:{}}];
      globalState.k = {
        d: {
          dashboard1: {
            f: filters
          },
          dashboard2: {
            f: filters
          }
        }
      };
      globalState.save();

      kibiStateHelper.removeAllFiltersOfType('join_set');

      expect(globalState.k.d.dashboard1.f).to.eql([{range:{}}]);
      expect(globalState.k.d.dashboard2.f).to.eql([{range:{}}]);
    });

    it('removeFilterOfTypeFromDashboard should not throw exception when dashboard does not yet exists in kibi state', function () {
      globalState.k = {
        d: {}
      };
      globalState.save();

      kibiStateHelper.removeFilterOfTypeFromDashboard('join_set', 'dashboard_which_does_not_yet_exist_in_kibi_state');

      expect(globalState.k.d.dashboard_which_does_not_yet_exist_in_kibi_state).to.eql({f: []});
    });

    it('addFilterToDashboard should not throw an exception when dashboard does not yet exists in kibi state', function () {
      globalState.k = {
        d: {}
      };
      globalState.save();

      kibiStateHelper.addFilterToDashboard('dashboard_which_does_not_yet_exist_in_kibi_state', {range:{}});

      expect(globalState.k.d.dashboard_which_does_not_yet_exist_in_kibi_state).to.eql({f: [{range:{}}]});
    });

    it('addFilterToDashboard should throw an exception when filter is null', function () {
      globalState.k = {
        d: {
          dashboardA: []
        }
      };
      globalState.save();

      try {
        kibiStateHelper.addFilterToDashboard('dashboardA', null);
      } catch (e) {
        expect(e.message).to.equal('No filter');
      }
    });


    it('enableRelation', function () {
      globalState.k = {
        j: []
      };
      globalState.save();

      kibiStateHelper.enableRelation({ dashboards: [ 'dA', 'dB' ], relation: 'A/a/B/b' });

      expect(globalState.k.j.length).to.equal(1);
      expect(globalState.k.j[0]).to.equal('dA/dB/a/b');
    });

    it('disableRelation', function () {
      globalState.k = {
        j: ['a', 'A/B/a/b', 'c']
      };
      globalState.save();

      kibiStateHelper.disableRelation({ dashboards: [ 'A', 'B' ], relation: 'ia/a/ib/b' });

      expect(globalState.k.j.length).to.equal(2);
      expect(globalState.k.j[0]).to.equal('a');
      expect(globalState.k.j[1]).to.equal('c');
    });

    it('isRelationEnabled', function () {
      globalState.k = {
        j: ['d1/d2/a/b']
      };
      globalState.save();

      expect(kibiStateHelper.isRelationEnabled({ dashboards: [ 'd1', 'd2' ], relation: 'i1/a/i2/b' })).to.equal(true);
      expect(kibiStateHelper.isRelationEnabled({ dashboards: [ 'd1', 'd3' ], relation: 'i1/a/i2/b' })).to.equal(false);
    });

    it('isRelationEnabled should return false if j not initialized', function () {
      globalState.k = {};
      globalState.save();

      expect(kibiStateHelper.isRelationEnabled({ dashboards: [ 'd1', 'd2' ], relation: 'i1/a/i2/b' })).to.equal(false);
      expect(kibiStateHelper.isRelationEnabled({ dashboards: [ 'd1', 'd3' ], relation: 'i1/a/i2/b' })).to.equal(false);
    });

    it('getEnabledRelations should return 3 pairs', function () {
      globalState.k = {
        j: [
          'A/B/apath,bpath',
          'B/C/bpath,cpath',
          'C/D/cpath,dpath'
        ]
      };
      globalState.save();

      expect(kibiStateHelper.getEnabledRelations()).to.eql([
        ['A','B'],
        ['B','C'],
        ['C','D']
      ]);
    });

    it('getEnabledRelations should return an empty array if no j', function () {
      globalState.k = {};
      globalState.save();

      expect(kibiStateHelper.getEnabledRelations()).to.eql([]);
    });

    it('getEnabledRelations should return an empty array if j is empty ', function () {
      globalState.k = {
        j: []
      };
      globalState.save();

      expect(kibiStateHelper.getEnabledRelations()).to.eql([]);
    });

  });
});


