import noDigestPromises from 'test_utils/no_digest_promises';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';
import pollUntil from './_poll_until';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';

import '../kibi_sync_time_to';

const isChrome = !!window.chrome && !!window.chrome.webstore;

describe('Kibi Components', function () {
  describe('kibi_sync_time_to', function () {

    noDigestPromises.activateForSuite();

    let $timeout;
    let $rootScope;
    let kibiState;
    let timefilter;
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

    const pollUntilDashboardsAreResolved = function (done, cb, syncedDashboards) {
      if (!cb) {
        throw new Error('provide a callback');
      }

      pollUntil(
        function () {
          return directiveScope.dashboardGroups && directiveScope.dashboardGroups.length > 0 &&
          directiveScope.dashboardGroups[0].dashboards.length === timeBasedDashboards.length;
        }, 1000, 1,
        function (err) {
          if (err) {
            done(err);
          }
          if (syncedDashboards) {
            // check the box of all already synced dashboards
            _.each(syncedDashboards, dashboardId => selectDashboardCheckbox($el, dashboardId));
          }
          // current dashboard is always selected
          selectDashboardCheckbox($el, timeBasedDashboards[0].id);

          // now we know the scope has the dashboards
          // call apply to modify html
          directiveScope.$apply();

          cb();
        }
      );
    };

    /**
     * Checks that the time on selected dashboards is correctly synced.
     *
     * @param expectedTime the time to sync to
     * @param selectedDashboards a list of dashboards to sync together
     */
    function assertDashboards(expectedTime, selectedDashboards = []) {
      expect(directiveScope.dashboardGroups[0].dashboards.length).to.equal(timeBasedDashboards.length);

      const checkDashboard = function (dashboardId, syncedDashboards) {
        const dash = _.find(directiveScope.dashboardGroups[0].dashboards, 'id', dashboardId);

        expect(dash.selected).to.equal(Boolean(syncedDashboards));

        // save time of selected dashboard
        if (syncedDashboards) {
          sinon.assert.calledWith(spySaveTimeForDashboardId, dashboardId);
        } else {
          sinon.assert.neverCalledWith(spySaveTimeForDashboardId, dashboardId);
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
      sinon.assert.callCount(spySaveTimeForDashboardId, selectedDashboards.length);
    }

    function init({ mode, expectedTime, syncedDashboards }) {
      ngMock.module(
        'kibana',
        'kibana/courier',
        'kibana/global_state',
        function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
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

      ngMock.inject(function (_kibiState_, _$rootScope_, $compile, $injector, _$timeout_, _timefilter_) {
        kibiState = _kibiState_;
        timefilter = _timefilter_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        directiveScope = $rootScope.$new();
        directiveScope.mode = mode;
        if (expectedTime) {
          timefilter.time.from = expectedTime.f;
          timefilter.time.to = expectedTime.t;
          directiveScope.mode = expectedTime.m;
        }
        spyApplyRelative = directiveScope.applyRelative = sinon.spy();
        spyApplyAbsolute = directiveScope.applyAbsolute = sinon.spy();

        sinon.stub(kibiState, '_getCurrentDashboardId').returns(timeBasedDashboards[0].id);
        if (syncedDashboards) {
          sinon.stub(kibiState, 'getSyncedDashboards').returns(syncedDashboards);
        }
        spySaveTimeForDashboardId = sinon.spy(kibiState, '_saveTimeForDashboardId');

        $el = $compile('<kibi-sync-time-to></kibi-sync-time-to>')(directiveScope);
        directiveScope.$apply();
      });
    }

    function isSelectAllChecked(el) {
      return el.find('table tr:first-child input[type=\'checkbox\']')[0].checked;
    };

    function checkSelectAllCheckbox(el) {
      if (isChrome) {
        el.find('table tr:first-child input[type=\'checkbox\']').click();
      } else {
        el.find('table tr:first-child input[type=\'checkbox\']').prop('checked', true).click();
      }
    };

    function uncheckAllDashboardCheckboxes(el) {
      // select all checkboxes but the first one
      if (isChrome) {
        el.find('table tr:first-child input[type=\'checkbox\']').filter(':checked').click();
      } else {
        el.find('table tr:first-child input[type=\'checkbox\']').filter(':checked').prop('checked', true).click();
      }
    };

    function checkAllDashboardCheckboxes(el) {
      if (isChrome) {
        el.find('table tr:first-child input[type=\'checkbox\']').click();
      } else {
        el.find('table tr:first-child input[type=\'checkbox\']').prop('checked', true).click();
      }
    };

    function selectDashboardCheckbox(el, dashboardId) {
      const n = _.findIndex(timeBasedDashboards, 'id', dashboardId);

      if (n === -1) {
        throw new Error(`Unknown dashboard: ${dashboardId}`);
      }
      if (isChrome) {
        el.find(`table tr:nth-child(2) section:nth-child(${n + 2}) input[type='checkbox']`).click();
      } else {
        el.find(`table tr:nth-child(2) section:nth-child(${n + 2}) input[type='checkbox']`).prop('checked', true).click();
      }
    };

    _.each([
      'relative',
      'absolute'
    ], mode => {
      const expectedTime = {
        f: 'now-123y',
        t: 'now',
        m: mode
      };

      describe(`timepicker on ${mode} mode`, function () {

        describe('selectAll', function () {
          beforeEach(function () {
            init({
              mode
            });
          });

          it('should select/deselect selectAll if all checkbox where checked/unchecked', function (done) {
            pollUntilDashboardsAreResolved(done, function () {
              expect(isSelectAllChecked($el)).to.equal(false);

              checkAllDashboardCheckboxes($el);
              expect(isSelectAllChecked($el)).to.equal(true);

              uncheckAllDashboardCheckboxes($el);
              expect(isSelectAllChecked($el)).to.equal(false);

              done();
            });
          });
        });

        describe('already synced dashboards', function () {
          beforeEach(function () {
            init({
              mode,
              syncedDashboards: [ 'dashC' ],
              expectedTime
            });
          });

          it('should retrieve already synced dashboards', function (done) {
            pollUntilDashboardsAreResolved(done, function () {
              _.each(directiveScope.dashboardGroups[0].dashboards, (dashboard, i) => {
                if (dashboard.id === 'dashA' || dashboard.id === 'dashC') { // current or selected dashboards
                  expect(dashboard.selected).to.be(true);
                } else {
                  expect(dashboard.selected).to.be(false);
                }
              });
              done();
            });
          });

          it('should delete previously synced dashboards if everything is unselected', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime);
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              _.each(directiveScope.dashboardGroups[0].dashboards, (dashboard, i) => {
                if (dashboard.id === 'dashA' || dashboard.id === 'dashC') { // current or selected dashboards
                  expect(dashboard.selected).to.be(true);
                } else {
                  expect(dashboard.selected).to.be(false);
                }
              });
              checkAllDashboardCheckboxes($el);
              uncheckAllDashboardCheckboxes($el);
              $el.find('button[type=\'submit\']').click();
            }, [ 'dashC' ]);
          });
        });

        describe('choose a set of dashboards to sync the time on', function () {
          beforeEach(function () {
            init({ mode, expectedTime });
          });

          it('should update the list of synced dashboards', function (done) {
            let count = 0;

            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? count + 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? count + 1 : 0);

              if (count === 0) {
                assertDashboards(expectedTime, [ 'dashC' ]);

                // prepare for the next assertion
                spySaveTimeForDashboardId.reset();
                kibiState._setDashboardProperty('dashC', kibiState._properties.time);

                // unselect dashC and select dashB
                selectDashboardCheckbox($el, 'dashB');
                selectDashboardCheckbox($el, 'dashC');
                $el.find('button[type=\'submit\']').click();
              } else if (count === 1) {
                assertDashboards(expectedTime, [ 'dashB' ]);
                done();
              } else {
                expect.fail('should have only two save_with_changes events');
              }
              count++;
            });

            pollUntilDashboardsAreResolved(done, function () {
              selectDashboardCheckbox($el, 'dashC');
              $el.find('button[type=\'submit\']').click();
            });
          });

          it('should change the kibi state for all dashboards when selectAll clicked', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime, _.pluck(timeBasedDashboards, 'id'));
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              checkSelectAllCheckbox($el);
              $el.find('button[type=\'submit\']').click();
            });
          });

          it('should change the kibi state for all dashboards all individual checkboxes clicked', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime, _.pluck(timeBasedDashboards, 'id'));
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              checkAllDashboardCheckboxes($el);
              $el.find('button[type=\'submit\']').click();
            });
          });

          it('should save into kibistate the synced dashboards', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime, [ 'dashC' ]);
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              selectDashboardCheckbox($el, 'dashC');
              $el.find('button[type=\'submit\']').click();
            });
          });

          it('should change the kibi state for only the selected dashboard when 1 individual checkbox clicked', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime, [ 'dashB' ]);
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              selectDashboardCheckbox($el, 'dashB');
              $el.find('button[type=\'submit\']').click();
            });
          });

          it('should not put the current dashboard into the synced_dashboards object if it is not synced with anything', function (done) {
            kibiState.on('save_with_changes', function (diff) {
              expect(diff).to.eql([ kibiState._properties.dashboards ]);
              assertDashboards(expectedTime);
              expect(spyApplyRelative.callCount).to.equal(mode === 'relative' ? 1 : 0);
              expect(spyApplyAbsolute.callCount).to.equal(mode === 'absolute' ? 1 : 0);
              done();
            });

            pollUntilDashboardsAreResolved(done, function () {
              $el.find('button[type=\'submit\']').click();
            });
          });
        });
      });
    });
  });
});

