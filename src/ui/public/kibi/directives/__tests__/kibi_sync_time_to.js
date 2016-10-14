const sinon = require('auto-release-sinon');
const ngMock = require('ngMock');
const expect = require('expect.js');
const _ = require('lodash');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const isChrome = !!window.chrome && !!window.chrome.webstore;
const poolUntil = require('./_pool_until');

require('../kibi_sync_time_to');

describe('Kibi Components', function () {
  describe('kibi_sync_time_to', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    var $timeout;
    var $rootScope;
    var kibiState;
    var savedDashboards;
    var $el;
    var directiveScope;
    var spy;
    var spyApplyRelative;
    var spyApplyAbsolute;

    function init(kibiFunctionName, expectedTime) {
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
        }
      );

      ngMock.module('kibi_datasources/services/saved_datasources', function ($provide) {
        var fakeSavedDashboards = [
          {
            id: 'dashA',
            title: 'dashA',
            savedSearchId: 'savedSearchA'
          },
          {
            id: 'dashB',
            title: 'dashB',
            savedSearchId: 'savedSearchB'
          }
        ];
        var fakeSavedSearches = [
          {
            id: 'savedSearchA',
            searchSource: {
              index: function () {
                return {
                  hasTimeField: function () {
                    return true;
                  }
                };
              }
            }
          },
          {
            id: 'savedSearchB',
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
        $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', fakeSavedDashboards));
        $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', fakeSavedSearches));
      });

      ngMock.inject(function (_kibiState_, _$rootScope_, $compile, $injector, _$timeout_) {
        kibiState = _kibiState_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        directiveScope = $rootScope.$new();
        directiveScope.from = expectedTime.f;
        directiveScope.to = expectedTime.t;
        directiveScope.mode = expectedTime.m;
        directiveScope.applyRelative = function () {};
        directiveScope.applyAbsolute = function () {};
        spy = sinon.spy(kibiState, '_saveTimeForDashboardId');
        spyApplyRelative = sinon.spy(directiveScope, 'applyRelative');
        spyApplyAbsolute = sinon.spy(directiveScope, 'applyAbsolute');

        $el = $compile('<kibi-sync-time-to kibi-function="' + kibiFunctionName + '"></kibi-sync-time-to>')(directiveScope);
        directiveScope.$apply();
      });
    }

    function findDashboardInScope(dashboardId) {
      return _.find(directiveScope.dashboards, (d) => {
        return d.id === dashboardId;
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

    function checkFirstIndividualCheckbox(el) {
      if (isChrome) {
        el.find('table tr:nth-child(2) li:first-child input[type=\'checkbox\']').click();
      } else {
        el.find('table tr:nth-child(2) li:first-child input[type=\'checkbox\']').prop('checked', true).click();
      }
    };

    describe('applyQuick mode', function () {
      var expectedTime = {
        f: 'now-123y',
        t: 'now',
        m: 'quick'
      };

      beforeEach(function () {
        init('applyQuick', expectedTime);
      });

      it('should change the kibi state for all dashboards when selectAll clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });


        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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

      it('should change the kibi state for only 1 dashboards when 1 individual checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(1);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });


        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();

            checkFirstIndividualCheckbox($el);
            $el.find('button[type=\'submit\']').click();
          }
        );
      });

      it('should NOT change the kibi state for all dashboards when no checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['j']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(false);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(0);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(undefined);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();

            $el.find('button[type=\'submit\']').click();
            // here lets wait a bit and
            // trigger the save event ourselves as the click action will not do it
            // because we did not select any dashboard
            setTimeout(function () {
              kibiState.enableRelation({});
              kibiState.save();
            }, 300);
          }
        );
      });
    });


    describe('applyRelative mode', function () {
      var expectedTime = {
        f: 'now-123y',
        t: 'now',
        m: 'relative'
      };

      beforeEach(function () {
        init('applyRelative', expectedTime);
      });

      it('should change the kibi state for all dashboards when selectAll clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(1);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(1);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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

      it('should change the kibi state for only 1 dashboards when 1 individual checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(1);
          expect(spyApplyRelative.callCount).to.equal(1);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();
            checkFirstIndividualCheckbox($el);
            $el.find('button[type=\'submit\']').click();
          }
        );
      });

      it('should NOT change the kibi state for all dashboards when no checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['j']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(false);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(0);
          expect(spyApplyRelative.callCount).to.equal(1);
          expect(spyApplyAbsolute.callCount).to.equal(0);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(undefined);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();

            $el.find('button[type=\'submit\']').click();

            // wait a bit and trigger kibiState.save with extra filter ourselves
            setTimeout(function () {
              kibiState.enableRelation({});
              kibiState.save();
            }, 300);
          }
        );

      });
    });


    describe('applyAbsolute mode', function () {
      var expectedTime = {
        f: 'now-123y',
        t: 'now',
        m: 'absolute'
      };

      beforeEach(function () {
        init('applyAbsolute', expectedTime);
      });

      it('should change the kibi state for all dashboards when selectAll clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(1);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(true);
          expect(spy.callCount).to.equal(2);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(1);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(expectedTime);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
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

      it('should change the kibi state for only 1 dashboards when 1 individual checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['d']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(true);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(1);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(1);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(expectedTime);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();

            checkFirstIndividualCheckbox($el);
            $el.find('button[type=\'submit\']').click();
          }
        );
      });

      it('should NOT change the kibi state for all dashboards when no checkbox clicked', function (done) {
        kibiState.on('save_with_changes', function (diff) {
          expect(diff).to.eql(['j']);
          expect(directiveScope.dashboards.length).to.equal(2);
          var dashA = findDashboardInScope('dashA');
          var dashB = findDashboardInScope('dashB');
          expect(dashA.selected).to.equal(false);
          expect(dashB.selected).to.equal(false);
          expect(spy.callCount).to.equal(0);
          expect(spyApplyRelative.callCount).to.equal(0);
          expect(spyApplyAbsolute.callCount).to.equal(1);
          expect(kibiState._getDashboardProperty('dashA', kibiState._properties.time)).to.eql(undefined);
          expect(kibiState._getDashboardProperty('dashB', kibiState._properties.time)).to.eql(undefined);
          done();
        });

        poolUntil(
          function () {
            return directiveScope.dashboards && directiveScope.dashboards.length === 2;
          }, 1000, 1,
          function (err) {
            if (err) {
              done(err);
            }
            // now we know the scope has the dashboards
            // call apply to modify html
            directiveScope.$apply();

            $el.find('button[type=\'submit\']').click();

            // wait a bit and trigger kibiState.save with extra filter ourselves
            setTimeout(function () {
              kibiState.enableRelation({});
              kibiState.save();
            }, 300);
          }
        );

      });
    });

  });
});

