const sinon = require('auto-release-sinon');
const ngMock = require('ngMock');
const expect = require('expect.js');
const _ = require('lodash');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const isChrome = !!window.chrome && !!window.chrome.webstore;
const pollUntil = require('./_poll_until');

require('../kibi_sync_time_to');

describe('Kibi Components', function () {
  describe('kibi_sync_time_to', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    let $timeout;
    let $rootScope;
    let kibiState;
    let savedDashboards;
    let $el;
    let directiveScope;
    let spySaveTimeForDashboardId;
    let spyApplyRelative;
    let spyApplyAbsolute;

    const timeBasedDashboards = [
      {
        id: 'dashA',
        title: 'dashA',
        savedSearchId: 'savedSearch'
      },
      {
        id: 'dashB',
        title: 'dashB',
        savedSearchId: 'savedSearch'
      },
      {
        id: 'dashC',
        title: 'dashC',
        savedSearchId: 'savedSearch'
      }
    ];
    const timeBasedSavedSearches = [
      {
        id: 'savedSearch',
        searchSource: {
          index: function () {
            return {
              hasTimeField: function () {
                return true;
              }
            };
          }
        }
      }
    ];

    /**
     * Checks that the time on selected dashboards is correctly synced.
     *
     * @param expectedTime the time to sync to
     * @param selectedDashboards a list of dashboards to sync together
     */
    function assertDashboards(expectedTime, selectedDashboards = []) {
      expect(directiveScope.dashboards.length).to.equal(timeBasedDashboards.length);

      const checkDashboard = function (dashboardId, syncedDashboards) {
        const dash = _.find(directiveScope.dashboards, 'id', dashboardId);

        expect(dash.selected).to.equal(Boolean(syncedDashboards));

        // save time of selected dashboard
        if (syncedDashboards) {
          expect(spySaveTimeForDashboardId.calledWith(dashboardId)).to.be(true);
        } else {
          expect(spySaveTimeForDashboardId.calledWith(dashboardId)).to.be(false);
        }

        // time is synced
        if (syncedDashboards) {
          expect(kibiState._getDashboardProperty(dashboardId, kibiState._properties.time)).to.eql(expectedTime);
        } else {
          expect(kibiState._getDashboardProperty(dashboardId, kibiState._properties.time)).to.be(undefined);
        }

        // synced dashboards are saved
        if (syncedDashboards && syncedDashboards.length) {
          expect(kibiState._getDashboardProperty(dashboardId, kibiState._properties.synced_dashboards)).to.eql(syncedDashboards);
        } else {
          expect(kibiState._getDashboardProperty(dashboardId, kibiState._properties.synced_dashboards)).to.be(undefined);
        }
      };

      // the current dashboard should always be selected
      if (!_.contains(selectedDashboards, timeBasedDashboards[0].id)) {
        selectedDashboards.push(timeBasedDashboards[0].id);
      }

      _.each(timeBasedDashboards, dashboard => {
        if (_.contains(selectedDashboards, dashboard.id)) {
          checkDashboard(dashboard.id, _.without(selectedDashboards, dashboard.id));
        } else {
          checkDashboard(dashboard.id);
        }
      });
      expect(spySaveTimeForDashboardId.callCount).to.be(selectedDashboards.length);
    }

    function init({ kibiFunctionName, expectedTime, syncedDashboards }) {
      ngMock.module(
        'kibana',
        'kibana/courier',
        'kibana/global_state',
        function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
          $provide.constant('kibiDefaultDashboardId', '');
          $provide.constant('elasticsearchPlugins', ['siren-join']);
          $provide.service('$route', function () {
            return {
              reload: _.noop
            };
          });
          $provide.service('savedDashboards', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedDashboards', timeBasedDashboards);
          });
          $provide.service('savedSearches', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedSearches', timeBasedSavedSearches);
          });
        }
      );

      ngMock.inject(function (_kibiState_, _$rootScope_, $compile, $injector, _$timeout_) {
        kibiState = _kibiState_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        directiveScope = $rootScope.$new();
        if (expectedTime) {
          directiveScope.from = expectedTime.f;
          directiveScope.to = expectedTime.t;
          directiveScope.mode = expectedTime.m;
        }
        spyApplyRelative = directiveScope.applyRelative = sinon.spy();
        spyApplyAbsolute = directiveScope.applyAbsolute = sinon.spy();

        sinon.stub(kibiState, '_getCurrentDashboardId').returns(timeBasedDashboards[0].id);
        sinon.stub(kibiState, 'getSyncedDashboards').returns(syncedDashboards);
        spySaveTimeForDashboardId = sinon.spy(kibiState, '_saveTimeForDashboardId');

        $el = $compile('<kibi-sync-time-to kibi-function="' + kibiFunctionName + '"></kibi-sync-time-to>')(directiveScope);
        directiveScope.$apply();
      });
    }

    function checkSelectAllCheckbox(el) {
      if (isChrome) {
        el.find('table tr:first-child input[type=\'checkbox\']').click();
      } else {
        el.find('table tr:first-child input[type=\'checkbox\']').prop('checked', true).click();
      }
    };

    function checkAllIndividualCheckboxes(el) {
      if (isChrome) {
        el.find('table tr:nth-child(2) input[type=\'checkbox\']').click();
      } else {
        el.find('table tr:nth-child(2) input[type=\'checkbox\']').prop('checked', true).click();
      }
    };

    function selectDashboardCheckbox(el, dashboardId) {
      const n = _.findIndex(timeBasedDashboards, 'id', dashboardId);

      if (n === -1) {
        throw new Error(`Unknown dashboard: ${dashboardId}`);
      }
      if (isChrome) {
        el.find(`table tr:nth-child(2) li:nth-child(${n + 1}) input[type=\'checkbox\']`).click();
      } else {
        el.find(`table tr:nth-child(2) li:nth-child(${n + 1}) input[type=\'checkbox\']`).prop('checked', true).click();
      }
    };

    it('should retrieve already synced dashboards', function (done) {
      init({ syncedDashboards: [ 'dashC' ] });

      pollUntil(
        function () {
          return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
        }, 1000, 1,
        function (err) {
          if (err) {
            done(err);
          }
          _.each(directiveScope.dashboards, (dashboard, i) => {
            if (i === 0 || dashboard.id === 'dashC') { // current dashboard
              expect(dashboard.selected).to.be(true);
            } else {
              expect(dashboard.selected).to.be(false);
            }
          });
          done();
        }
      );
    });

    _.each([
      'quick',
      'relative',
      'absolute'
    ], mode => {
      const expectedTime = {
        f: 'now-123y',
        t: 'now',
        m: mode
      };

      describe(`apply ${mode} mode`, function () {
        beforeEach(function () {
          init({ kibiFunctionName: `apply${_.capitalize(mode)}`, expectedTime });
        });

        it('should change the kibi state for all dashboards when selectAll clicked', function (done) {
          kibiState.on('save_with_changes', function (diff) {
            expect(diff).to.eql([ kibiState._properties.dashboards ]);
            assertDashboards(expectedTime, _.pluck(timeBasedDashboards, 'id'));
            expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
            expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
            done();
          });

          pollUntil(
            function () {
              return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
            }, 1000, 1,
            function (err) {
              if (err) {
                done(err);
              }
              // now we know the scope has the dashboards
              // call apply to modify html
              directiveScope.$apply();

              checkSelectAllCheckbox($el);
              $el.find('button[type=\'submit\']').click();
            }
          );
        });

        it('should change the kibi state for all dashboards all individual checkboxes clicked', function (done) {
          kibiState.on('save_with_changes', function (diff) {
            expect(diff).to.eql([ kibiState._properties.dashboards ]);
            assertDashboards(expectedTime, _.pluck(timeBasedDashboards, 'id'));
            expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
            expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
            done();
          });

          pollUntil(
            function () {
              return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
            }, 1000, 1,
            function (err) {
              if (err) {
                done(err);
              }
              // now we know the scope has the dashboards
              // call apply to modify html
              directiveScope.$apply();

              checkAllIndividualCheckboxes($el);
              $el.find('button[type=\'submit\']').click();
            }
          );
        });

        it('should save into kibistate the synced dashboards', function (done) {
          kibiState.on('save_with_changes', function (diff) {
            expect(diff).to.eql([ kibiState._properties.dashboards ]);
            assertDashboards(expectedTime, [ 'dashC' ]);
            expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
            expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
            done();
          });

          pollUntil(
            function () {
              return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
            }, 1000, 1,
            function (err) {
              if (err) {
                done(err);
              }
              // now we know the scope has the dashboards
              // call apply to modify html
              directiveScope.$apply();

              selectDashboardCheckbox($el, 'dashC');
              $el.find('button[type=\'submit\']').click();
            }
          );
        });

        it('should change the kibi state for only the selected dashboard when 1 individual checkbox clicked', function (done) {
          kibiState.on('save_with_changes', function (diff) {
            expect(diff).to.eql([ kibiState._properties.dashboards ]);
            assertDashboards(expectedTime, [ 'dashB' ]);
            expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
            expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
            done();
          });

          pollUntil(
            function () {
              return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
            }, 1000, 1,
            function (err) {
              if (err) {
                done(err);
              }
              // now we know the scope has the dashboards
              // call apply to modify html
              directiveScope.$apply();

              selectDashboardCheckbox($el, 'dashB');
              $el.find('button[type=\'submit\']').click();
            }
          );
        });

        it('should not put the current dashboard into the synced_dashboards object if it is not synced with anithing', function (done) {
          kibiState.on('save_with_changes', function (diff) {
            expect(diff).to.eql([ kibiState._properties.dashboards ]);
            assertDashboards(expectedTime);
            expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
            expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
            done();
          });

          pollUntil(
            function () {
              return directiveScope.dashboards && directiveScope.dashboards.length === timeBasedDashboards.length;
            }, 1000, 1,
            function (err) {
              if (err) {
                done(err);
              }
              // now we know the scope has the dashboards
              // call apply to modify html
              directiveScope.$apply();

              $el.find('button[type=\'submit\']').click();
            }
          );
        });
      });
    });
  });
});

