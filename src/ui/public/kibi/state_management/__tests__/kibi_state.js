import { Notifier } from 'ui/notify/notifier';
import * as onPage from 'ui/kibi/utils/on_page';
import moment from 'moment';
import sinon from 'sinon';
import _ from 'lodash';
import Promise from 'bluebird';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { MockState } from 'fixtures/mock_state';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';
import noDigestPromises from 'test_utils/no_digest_promises';
import { DecorateQueryProvider } from 'ui/courier/data_source/_decorate_query';

import 'ui/kibi/state_management/kibi_state';

describe('State Management', function () {
  let $location;
  let kibiState;
  let config;
  let timefilter;
  let appState;
  let globalState;
  let indexPatternsService;
  let mockDecorateQuery;

  let disableFiltersIfOutdatedSpy;

  let onDashboardPageSpy;
  let onManagementPageSpy;
  let onVisualizePageSpy;

  const defaultStartTime = '2006-09-01T12:00:00.000Z';
  const defaultEndTime = '2010-09-05T12:00:00.000Z';

  const init = function ({
      pinned,
      savedDashboards = [],
      savedSearches = [],
      indexPatterns = [],
      currentPath = '/dashboard',
      currentDashboardId = 'dashboard1'
    } = {}) {
    ngMock.module('kibana', 'kibana/courier', 'kibana/global_state', ($provide) => {
      $provide.service('$route', () => {
        const myRoute = {
          current: {
            locals: {
              dash: {
                id: currentDashboardId
              }
            }
          }
        };
        if (currentDashboardId === null) {
          delete myRoute.current.locals;
        }
        return myRoute;
      });

      appState = new MockState({ filters: [] });
      $provide.service('getAppState', () => {
        return function () { return appState; };
      });

      globalState = new MockState({ filters: pinned || [] });
      $provide.service('globalState', () => globalState);

      $provide.constant('kbnIndex', '.kibi');
      $provide.constant('kbnDefaultAppId', '');
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', (Promise, Private) => mockSavedObjects(Promise, Private)('indexPatterns', indexPatterns, true));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards));
    });

    ngMock.inject(function (elasticsearchPlugins, _indexPatterns_, _timefilter_, _config_, _$location_, _kibiState_) {
      onDashboardPageSpy = sinon.stub(onPage, 'onDashboardPage').returns(currentPath.split('/')[1] === 'dashboard');
      onVisualizePageSpy = sinon.stub(onPage, 'onVisualizePage').returns(currentPath.split('/')[1] === 'visualize');
      onManagementPageSpy = sinon.stub(onPage, 'onManagementPage').returns(currentPath.split('/')[1] === 'settings');

      indexPatternsService = _indexPatterns_;
      timefilter = _timefilter_;
      $location = _$location_;
      kibiState = _kibiState_;

      disableFiltersIfOutdatedSpy = sinon.spy(kibiState, 'disableFiltersIfOutdated');

      sinon.stub(elasticsearchPlugins, 'get').returns([ 'siren-vanguard' ]);

      config = _config_;
      const defaultTime = {
        mode: 'absolute',
        from: defaultStartTime,
        to: defaultEndTime
      };

      config.set('query:queryString:options', { analyze_wildcard: true });
      config.set('timepicker:timeDefaults', defaultTime);
      timefilter.time = defaultTime;
    });

    ngMock.inject(function (Private) {
      mockDecorateQuery = Private(DecorateQueryProvider);
    });
  };

  describe('Kibi State', function () {

    noDigestPromises.activateForSuite();

    // https://github.com/elastic/kibana/pull/8822 ensure that the notifier is emptied by each test
    afterEach(() => {
      Notifier.prototype._notifs.length = 0;
      onDashboardPageSpy.restore();
      onVisualizePageSpy.restore();
      onManagementPageSpy.restore();
    });

    describe('_isDefaultQuery', function () {
      beforeEach(() => init());

      it('should be a default query', function () {
        const query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };

        expect(kibiState._isDefaultQuery(query)).to.be(true);
      });

      it('should not be a default query', function () {
        const query = {
          query_string: {
            query: 'dog',
            analyze_wildcard: true
          }
        };

        expect(kibiState._isDefaultQuery(query)).to.be(false);
      });
    });

    describe('handle state with outdated filters', function () {
      beforeEach(() => init());

      it('should disable join_sequence filter if the version is not set', function () {
        const filters = [
          {
            join_sequence: [],
            meta: {
              label: 'join1'
            }
          }
        ];

        kibiState.disableFiltersIfOutdated(filters, 'dashboard1');
        expect(filters[0].meta.disabled).to.be(true);
      });

      it('should leave the join_sequence filter as is if the version is set', function () {
        const filter = {
          join_sequence: [],
          meta: {
            label: 'join1',
            version: 2
          }
        };

        kibiState.disableFiltersIfOutdated([ filter ], 'dashboard1');
        expect(filter.meta.disabled).to.be(undefined);
      });
    });

    describe('selected entity', function () {
      describe('isEntitySelected', function () {
        beforeEach(() => init());

        it('should return true if the given entity is the one selected', function () {
          const index = 'a';
          const type = 'b';
          const id = 'c';
          const column = 'd';

          kibiState.setEntityURI({ index, type, id, column });
          expect(kibiState.isEntitySelected(index, type, id, column)).to.be(true);
        });

        it('should return false if entity is not the one selected', function () {
          kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c', column: 'd' });
          [
            [ 'e', 'b', 'c', 'd' ],
            [ 'a', 'e', 'c', 'd' ],
            [ 'a', 'b', 'e', 'd' ],
            [ 'a', 'b', 'c', 'e' ]
          ].forEach(([ index, type, id, column ]) => {
            expect(kibiState.isEntitySelected(index, type, id, column)).to.be(false);
          });
        });

        it('should not fail if arguments are undefined', function () {
          expect(kibiState.isEntitySelected()).to.be(false);
          expect(kibiState.isEntitySelected('a')).to.be(false);
          expect(kibiState.isEntitySelected('a', 'b')).to.be(false);
          expect(kibiState.isEntitySelected('a', 'b', 'c')).to.be(false);
        });
      });

      describe('getEntityURI', function () {
        it('should return the entity when on dashboard tab', function () {
          const entityURI = { index: 'a', type: 'b', id: 'c', column: 'd' };

          init({
            currentPath: '/dashboard'
          });
          kibiState.setEntityURI(entityURI);
          expect(kibiState.getEntityURI()).to.eql(entityURI);
        });

        it('should return the entity when on settings tab', function () {
          const entityURI = { index: 'a', type: 'b', id: 'c', column: 'd' };

          init({
            currentPath: '/settings'
          });
          kibiState.setEntityURI(entityURI);
          expect(kibiState.getEntityURI()).to.eql(entityURI);
        });

        it('should return the entity when on visualize tab', function () {
          const entityURI = { index: 'a', type: 'b', id: 'c', column: 'd' };

          init({
            currentPath: '/visualize'
          });
          kibiState.setEntityURI(entityURI);
          expect(kibiState.getEntityURI()).to.eql(entityURI);
        });

        it('should not return the entity when on discover tab', function () {
          const entityURI = { index: 'a', type: 'b', id: 'c', column: 'd' };

          init();

          kibiState.setEntityURI(entityURI);
          expect(kibiState.getEntityURI()).to.eql(entityURI);

          onVisualizePageSpy.returns(false);
          onManagementPageSpy.returns(false);
          onDashboardPageSpy.returns(false);
          expect(kibiState.getEntityURI).to.throwException(/Cannot get entity URI/);
        });

        it('should return the test entity when on settings/visualize tab', function () {
          const entityURI1 = { index: 'a', type: 'b', id: 'c', column: 'd' };
          const entityURI2 = { index: 'e', type: 'f', id: 'g', column: 'h' };

          init();

          kibiState.setEntityURI(entityURI1);
          expect(kibiState.getEntityURI()).to.eql(entityURI1);

          onVisualizePageSpy.returns(true);
          onManagementPageSpy.returns(false);
          onDashboardPageSpy.returns(false);
          kibiState.setEntityURI(entityURI2);
          expect(kibiState.getEntityURI()).to.eql(entityURI2);

          onVisualizePageSpy.returns(false);
          onManagementPageSpy.returns(true);
          onDashboardPageSpy.returns(false);
          expect(kibiState.getEntityURI()).to.eql(entityURI2);

          onVisualizePageSpy.returns(false);
          onManagementPageSpy.returns(false);
          onDashboardPageSpy.returns(true);
          expect(kibiState.getEntityURI()).to.eql(entityURI1);
        });
      });
    });

    describe('General Helpers', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'dashboard0',
            title: 'dashboard0'
          }
        ]
      }));

      it('set the selected dashboard in a group', function () {
        const groupId = 'group1';
        const dashboardId = 'Articles';

        kibiState.setSelectedDashboardId(groupId, dashboardId);
        expect(kibiState.getSelectedDashboardId(groupId)).to.equal(dashboardId);
      });

      it('should have _urlParam of _k', function () {
        expect(kibiState).to.have.property('_urlParam');
        expect(kibiState._urlParam).to.equal('_k');
      });

      it('should use previous state when not in URL', function () {
        // set satte via URL
        $location.search({ _k: '(foo:(bar:baz))' });
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ foo: { bar: 'baz' } });

        $location.search({ _k: '(fizz:buzz)' });
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ fizz: 'buzz' });

        $location.search({});
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ fizz: 'buzz' });
      });

      it('should not have a dashboard entry if every dashboard has no filter, default query/time', function () {
        return kibiState.getState('dashboard0')
        .then(({ filters, queries, time }) => {
          expect(filters).to.have.length(0);
          expect(queries).to.have.length(1);
          expect(kibiState._isDefaultQuery(queries[0])).to.be(true);
          expect(kibiState[kibiState._properties.dashboards]).to.not.be.ok();
          expect(time).to.be(null);
        });
      });

      it('should fail if dashboard is not passed', function (done) {
        kibiState.getState()
        .then(() => {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('Missing dashboard ID');
          done();
        });
      });

      it('should not fail if the dashboard is not associated with a search', function () {
        expect(kibiState.getState.bind(kibiState)).withArgs('dashboard0').to.not.throw;
      });
    });

    describe('getCurrentDashboardId', function () {
      it('getCurrentDashboardId', function () {
        init({ currentDashboardId: 'dashboard1' });
        expect(kibiState._getCurrentDashboardId()).to.equal('dashboard1');
      });

      it('getCurrentDashboardId when not on dashboard', function () {
        init({ currentDashboardId: null, currentPath: '/notdashboard/xxx' });
        expect(kibiState._getCurrentDashboardId()).to.equal(undefined);
      });
    });

    describe('getDashboardAndSavedSearchMetas', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'Companies',
            title: 'Companies'
          },
          {
            id: 'Articles',
            title: 'Articles',
            savedSearchId: 'missing search'
          },
          {
            id: 'search-ste',
            title: 'search-ste',
            savedSearchId: 'search-ste'
          }
        ],
        savedSearches: [
          {
            id: 'search-ste',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'search-ste',
                  filter: [],
                  query: {}
                }
              )
            }
          }
        ]
      }));

      it('get saved dashboard and saved search the order of dashboardIds should be preserved' , function () {
        // this tests checks that although the savedDashboard order is
        // 'Articles', 'search-ste'
        // when we provide the ids in reverse order like 'search-ste', 'Articles'
        // we get the meta in the same order as the ids were provided
        return Promise.all([
          kibiState._getDashboardAndSavedSearchMetas([ 'search-ste', 'Companies' ]),
          kibiState._getDashboardAndSavedSearchMetas([ 'Companies', 'search-ste' ])
        ])
        .then(function ([ results1, results2 ]) {
          expect(results1).to.have.length(2);
          expect(results1[0].savedDash.id).to.be('search-ste');
          expect(results1[0].savedSearchMeta.index).to.be('search-ste');
          expect(results1[1].savedDash.id).to.be('Companies');
          expect(results1[1].savedSearchMeta).to.be(null);

          expect(results2).to.have.length(2);
          expect(results2[0].savedDash.id).to.be('Companies');
          expect(results2[0].savedSearchMeta).to.be(null);
          expect(results2[1].savedDash.id).to.be('search-ste');
          expect(results2[1].savedSearchMeta.index).to.be('search-ste');
        });
      });

      it('get saved dashboard and saved search', function () {
        return kibiState._getDashboardAndSavedSearchMetas([ 'search-ste' ]).then(function (results) {
          expect(results).to.have.length(1);
          expect(results[0].savedDash.id).to.be('search-ste');
          expect(results[0].savedSearchMeta.index).to.be('search-ste');
        });
      });

      it('should reject promise if saved search associated to a dashboard is missing', function (done) {
        kibiState._getDashboardAndSavedSearchMetas([ 'Articles' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.contain('The dashboard [Articles] is associated with an unknown saved search.');
          done();
        });
      });

      it('should warn if saved search associated to a dashboard is missing and failOnMissingMeta is false', function () {
        return kibiState._getDashboardAndSavedSearchMetas([ 'Articles' ], false).then(function (results) {
          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('warning');
          expect(Notifier.prototype._notifs[0].content).to.contain('The dashboard [Articles] is associated with an unknown saved search.');
        });
      });

      it('should reject promise if an unknown dashboard is requested', function (done) {
        kibiState._getDashboardAndSavedSearchMetas([ 'search-ste', 'unknown dashboard' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('Unable to retrieve dashboards: unknown dashboard.');
          done();
        });
      });

      it('should warn if an unknown dashboard is requested and failOnMissingMeta is false', function () {
        return kibiState._getDashboardAndSavedSearchMetas([ 'search-ste', 'unknown dashboard' ], false).then(function (results) {
          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('warning');
          expect(Notifier.prototype._notifs[0].content).to.contain('Unable to retrieve dashboards: unknown dashboard.');
        });
      });
    });

    describe('Time-based indices', function () {
      describe('should always return an array of indices', function () {
        beforeEach(() => init({
          indexPatterns: [
            {
              id: 'forecast'
            },
            {
              id: 'weather-*',
              timeField: 'date',
              indexList: [ 'weather-2015-01' ]
            },
            {
              id: 'logs',
              timeField: 'date',
              missing: true
            },
            {
              id: 'error',
              timeField: 'date',
              error: true
            }
          ]
        }));

        it('should return an empty array if the index pattern does not match any index', function (done) {
          kibiState.timeBasedIndices('logs')
          .then(() => done())
          .catch((error) => done(`Unexpected error: ${error}`));
        });

        it('should throw an error if the index pattern cannot be retrieved because of a generic error', function (done) {
          kibiState.timeBasedIndices('error')
          .then(() => done(`Expected a rejection.`))
          .catch((error) => done());
        });

        it('should get an array of indices for a time-based pattern', function (done) {
          const stub = sinon.stub(kibiState, 'getTimeBounds').returns({
            min: moment('25-01-1995', 'DD-MM-YYYY'),
            max: moment('25-12-1995', 'DD-MM-YYYY')
          });
          kibiState.timeBasedIndices('weather-*', 'dashboard1')
          .then((indices) => {
            expect(stub.called).to.be(true);
            expect(indices).to.eql([ 'weather-2015-01' ]);
            done();
          }).catch(done);
        });

        it('should get an array of indices for a non time-based pattern', function (done) {
          const stub = sinon.stub(kibiState, 'getTimeBounds').returns({
            min: moment('25-01-1995', 'DD-MM-YYYY'),
            max: moment('25-12-1995', 'DD-MM-YYYY')
          });
          kibiState.timeBasedIndices('forecast', 'dashboard1')
          .then((indices) => {
            expect(stub.called).to.be(false);
            expect(indices).to.eql([ 'forecast' ]);
            done();
          }).catch(done);
        });
      });

      describe('should get the intersection of all time-ranges', function () {
        beforeEach(() => {
          init({
            indexPatterns: [
              {
                id: 'weather-*',
                timeField: 'date',
                indexList: [ 'weather-2015-01' ]
              }
            ]
          });
        });

        it('should get the intersection', function (done) {
          const getTimeBoundsStub = sinon.stub(kibiState, 'getTimeBounds');

          const dashboard1Time = {
            min: moment('25-01-1995', 'DD-MM-YYYY'),
            max: moment('25-12-1995', 'DD-MM-YYYY')
          };
          getTimeBoundsStub.withArgs('dashboard1').returns(dashboard1Time);

          const dashboard2Time = {
            min: moment('25-03-1995', 'DD-MM-YYYY'),
            max: moment('25-12-1996', 'DD-MM-YYYY')
          };
          getTimeBoundsStub.withArgs('dashboard2').returns(dashboard2Time);

          const dashboard3Time = {
            min: moment('25-04-1995', 'DD-MM-YYYY'),
            max: moment('25-12-2016', 'DD-MM-YYYY')
          };
          getTimeBoundsStub.withArgs('dashboard3').returns(dashboard3Time);

          Promise.all([
            indexPatternsService.get('weather-*'),
            kibiState.timeBasedIndices('weather-*', 'dashboard1', 'dashboard2', 'dashboard3')
          ])
          .then(([ indexPattern, indices ]) => {
            expect(indexPattern.toIndexList.calledWith(dashboard3Time.min, dashboard1Time.max)).to.be(true);
            done();
          }).catch(done);
        });

        it('should return an empty array on empty intersection', function (done) {
          const getTimeBoundsStub = sinon.stub(kibiState, 'getTimeBounds');

          const dashboard1Time = {
            min: moment('25-01-1995', 'DD-MM-YYYY'),
            max: moment('25-12-1995', 'DD-MM-YYYY')
          };
          const dashboard2Time = {
            min: moment('25-03-1996', 'DD-MM-YYYY'),
            max: moment('25-12-1996', 'DD-MM-YYYY')
          };
          getTimeBoundsStub.withArgs('dashboard1').returns(dashboard1Time);
          getTimeBoundsStub.withArgs('dashboard2').returns(dashboard2Time);

          Promise.all([
            indexPatternsService.get('weather-*'),
            kibiState.timeBasedIndices('weather-*', 'dashboard1', 'dashboard2')
          ])
          .then(([ indexPattern, indices ]) => {
            expect(indexPattern.toIndexList.called).to.be(false);
            expect(indices).to.eql([]);
            done();
          }).catch(done);
        });
      });
    });

    describe('Time', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          },
          {
            id: 'logs',
            timeField: 'date',
            missing: true
          },
          {
            id: 'error',
            timeField: 'date',
            error: true
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          },
          {
            id: 'logs',
            title: 'Logs',
            savedSearchId: 'search-logs'
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({ index: 'index1' })
            }
          },
          {
            id: 'search-logs',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'logs',
                  filter: [],
                  query: {}
                }
              )
            }
          }
        ],
      }));

      it('should get correct time', function (done) {
        kibiState._saveTimeForDashboardId('dashboard2', 'absolute', '2004-09-01T12:00:00.000Z', '2010-09-01T12:00:00.000Z');
        timefilter.time = {
          mode: 'absolute',
          from: '2006-09-01T12:00:00.000Z',
          to: '2009-09-01T12:00:00.000Z'
        };
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.time).to.eql({
            range: {
              date: {
                gte: parseWithPrecision('2006-09-01T12:00:00.000Z', false).valueOf(),
                lte: parseWithPrecision('2009-09-01T12:00:00.000Z', true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(state2.time).to.eql({
            range: {
              date: {
                gte: parseWithPrecision('2004-09-01T12:00:00.000Z', false).valueOf(),
                lte: parseWithPrecision('2010-09-01T12:00:00.000Z', true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          done();
        }).catch(done);
      });

      it('should get default time', function (done) {
        kibiState.getState('dashboard2')
        .then(({ time }) => {
          expect(time).to.eql({
            range: {
              date: {
                gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          done();
        }).catch(done);
      });

      it('should not reject promise if the index pattern does not match any index', function (done) {
        kibiState.getState('logs')
        .then(() => done())
        .catch((error) => done(`Unexpected error: ${error}`));
      });

      it('should reject promise if the index pattern cannot be retrieved because of a generic error', function (done) {
        kibiState.getState('error')
        .then(() => done(`Expected a rejection.`))
        .catch((error) => done());
      });

    });

    describe('Synchronize time across dashboard', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          },
          {
            id: 'index2',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2'
          }
        ]
      }));

      it('should emit a time event when changing the time of dashboard that is not the current one', function (done) {
        kibiState._saveTimeForDashboardId('dashboard2', 'absolute', '2014-09-01T12:00:00.000Z', '2020-09-01T12:00:00.000Z');

        kibiState.on('time', function (dashboardId, newTime, oldTime) {
          expect(dashboardId).to.be('dashboard2');
          expect(oldTime).to.eql({
            m: 'absolute',
            f: '2014-09-01T12:00:00.000Z',
            t: '2020-09-01T12:00:00.000Z'
          });
          expect(newTime).to.eql({
            m: 'absolute',
            f: '2004-09-01T12:00:00.000Z',
            t: '2010-09-01T12:00:00.000Z'
          });
          done();
        });

        kibiState._saveTimeForDashboardId('dashboard2', 'absolute', '2004-09-01T12:00:00.000Z', '2010-09-01T12:00:00.000Z');
      });

      it('should not emit a time event when changing the time of the current dashboard', function () {
        kibiState._saveTimeForDashboardId('dashboard1', 'absolute', '2014-09-01T12:00:00.000Z', '2020-09-01T12:00:00.000Z');
        kibiState._saveTimeForDashboardId('dashboard1', 'absolute', '2004-09-01T12:00:00.000Z', '2010-09-01T12:00:00.000Z');
        expect(kibiState._listeners.time).to.not.be.ok();
      });
    });

    describe('Query', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'torrent'
                    }
                  }
                }
              )
            }
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          }
        ]
      }));

      it('should not alter the kibistate query', function (done) {
        const query = {
          query_string: {
            query: 'mobile'
          }
        };

        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query);
        kibiState.getState('dashboard2')
        .then(({ queries }) => {
          expect(queries).to.have.length(2);
          queries[0].query_string.query = 'toto';
          queries[1].query_string.query = 'tata';
          expect(kibiState._getDashboardProperty('dashboard2', kibiState._properties.query).query_string.query).to.be('mobile');
          done();
        }).catch(done);
      });

      it('should not alter the appstate query', function (done) {
        const query1 = {
          query_string: {
            query: 'mobile'
          }
        };

        appState.query = query1;
        kibiState.getState('dashboard1')
        .then(({ queries }) => {
          expect(queries).to.have.length(2);
          queries[0].query_string.query = 'toto';
          queries[1].query_string.query = 'tata';
          expect(appState.query.query_string.query).to.be('mobile');
          done();
        }).catch(done);
      });

      it('should combine queries from the appstate/kibistate with the one from the search meta', function (done) {
        const query1 = {
          query_string: {
            query: 'mobile'
          }
        };
        const query2 = {
          query_string: {
            query: 'web'
          }
        };

        appState.query = query1;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query2);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.queries).to.eql([ query1, { query_string: { query: 'torrent' } } ]);
          expect(state2.queries).to.eql([ query2, { query_string: { query: 'torrent' } } ]);
          done();
        }).catch(done);
      });

      it('should remove duplicates', function (done) {
        const query = {
          query_string: {
            query: 'torrent'
          }
        };

        appState.query = query;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.queries).to.eql([ { query_string: { query: 'torrent' } } ]);
          expect(state2.queries).to.eql([ { query_string: { query: 'torrent' } } ]);
          done();
        }).catch(done);
      });
    });

    describe('Filters', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          }
        ],
        pinned: [
          {
            term: { field1: 'i am pinned' },
            meta: { disabled: false }
          },
          {
            term: { field1: 'i am pinned and disabled' },
            meta: { disabled: true }
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [
                    {
                      term: { field1: 'aaa' },
                      meta: { disabled: false }
                    },
                    {
                      term: { field1: 'eee' },
                      meta: { disabled: true }
                    }
                  ]
                }
              )
            }
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          }
        ]
      }));

      it('should not alter the kibistate filters', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          }
        ];

        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, filters);
        kibiState.getState('dashboard2')
        .then(({ filters }) => {
          expect(filters).to.have.length(3);
          // kibistate
          expect(filters[0].term.field1).to.be('bbb');
          // pinned filter
          expect(filters[1].term.field1).to.be('i am pinned');
          // search meta
          expect(filters[2].term.field1).to.be('aaa');
          const kibiStateFilters = kibiState._getDashboardProperty('dashboard2', kibiState._properties.filters);
          expect(kibiStateFilters).to.have.length(1);
          expect(kibiStateFilters[0].term.field1).to.be('bbb');
          done();
        }).catch(done);
      });

      it('should tag filters coming from the associated saved search', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          }
        ];

        appState.filters = filters;
        kibiState.getState('dashboard1')
        .then(({ filters }) => {
          const appStateFilter = _.find(filters, 'term.field1', 'bbb');
          expect(appStateFilter.meta.fromSavedSearch).not.to.be.ok();
          const savedSearchFilter = _.find(filters, 'term.field1', 'aaa');
          expect(savedSearchFilter.meta.fromSavedSearch).to.be(true);
          done();
        }).catch(done);
      });

      it('should not alter the appstate filters', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          }
        ];

        appState.filters = filters;
        kibiState.getState('dashboard1')
        .then(({ filters }) => {
          expect(filters).to.have.length(3);
          expect(appState.filters).to.have.length(1);
          done();
        }).catch(done);
      });

      it('should remove duplicates', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          },
          {
            term: { field1: 'aaa' },
            meta: { disabled: false }
          },
          {
            term: {
              field1: 'i am pinned'
            },
            meta: {
              disabled: false
            }
          }
        ];

        appState.filters = filters;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, filters);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.filters).to.have.length(3);
          expect(state2.filters).to.have.length(3);
          done();
        }).catch(done);
      });

      it('should combine filters from kibistate/appstate with the pinned filters', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };
        const filter2 = {
          term: { field2: 'ccc' },
          meta: { disabled: false }
        };

        appState.filters = [ filter1 ];
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, [ filter2 ]);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          const rest = [
            {
              term: {
                field1: 'i am pinned'
              },
              meta: {
                disabled: false
              }
            },
            {
              term: {
                field1: 'aaa'
              },
              meta: {
                disabled: false,
                fromSavedSearch: true
              }
            }
          ];
          expect(state1.filters).to.eql([ filter1, ...rest ]);
          expect(state2.filters).to.eql([ filter2, ...rest ]);
          done();
        }).catch(done);
      });

      it('should remove disabled filters', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };
        const filter2 = {
          term: { field2: 'ccc' },
          meta: { disabled: false }
        };

        appState.filters = [
          filter1,
          {
            term: { field1: 'ddd' },
            meta: {
              disabled: true
            }
          }
        ];
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, [
          filter2,
          {
            term: { field1: 'ddd' },
            meta: {
              disabled: true
            }
          }
        ]);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          const extras = [
            {
              term: {
                field1: 'i am pinned'
              },
              meta: {
                disabled: false
              }
            },
            {
              term: {
                field1: 'aaa'
              },
              meta: {
                disabled: false,
                fromSavedSearch: true
              }
            }
          ];
          expect(state1.filters).to.eql([ filter1, ...extras ]);
          expect(state2.filters).to.eql([ filter2, ...extras ]);
          done();
        }).catch(done);
      });
    });

    describe('Save AppState', function () {
      describe('Dashboard saved without filters and query', function () {
        beforeEach(() => init({
          pinned: [
            {
              term: { field1: 'i am pinned' },
              meta: { disabled: false }
            }
          ],
          savedSearches: [
            {
              id: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'index1',
                    filter: [
                      {
                        term: { field1: 'aaa' },
                        meta: { disabled: false }
                      }
                    ],
                    query: {
                      query_string: {
                        query: 'torrent'
                      }
                    }
                  }
                )
              }
            }
          ],
          savedDashboards: [
            {
              id: 'dashboard1',
              title: 'dashboard1',
              savedSearchId: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'index1',
                    filter: [
                      {
                        query: {
                          query_string: {
                            analyze_wildcard: true,
                            query: '*'
                          }
                        }
                      }
                    ]
                  }
                )
              }
            }
          ]
        }));

        it('should not store in kibistate an empty array for filters', function (done) {
          appState.filters = [];
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.not.be.ok();
            done();
          }).catch(done);
        });

        it('should not store in kibistate the default query/time', function (done) {
          const filter1 = {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          };

          appState.filters = [ filter1 ];
          appState.query = {
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          };
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.not.be.ok();
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
            done();
          }).catch(done);
        });

        it('should save appstate to kibistate', function () {
          const filter1 = {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          };
          const query = {
            query_string: {
              query: 'kibi',
              analyze_wildcard: true
            }
          };
          const time = {
            mode: 'quick',
            from: 'now-500y',
            to: 'now'
          };

          appState.filters = [ filter1 ];
          appState.query = query;
          timefilter.time = time;

          return kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.eql(query);
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.eql({
              m: time.mode,
              f: time.from,
              t: time.to
            });
          });
        });

        it('should save disabled filter to kibistate', function (done) {
          const filter1 = {
            term: { field1: 'bbb' },
            meta: { disabled: true }
          };

          appState.filters = [ filter1 ];
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
            done();
          }).catch(done);
        });
      });

      describe('Dashboard saved with filters and query', function () {
        beforeEach(() => init({
          pinned: [
            {
              term: { field1: 'i am pinned' },
              meta: { disabled: false }
            }
          ],
          savedSearches: [
            {
              id: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'index1',
                    filter: [
                      {
                        term: { field1: 'aaa' },
                        meta: { disabled: false }
                      }
                    ],
                    query: {
                      query_string: {
                        query: 'torrent'
                      }
                    }
                  }
                )
              }
            }
          ],
          savedDashboards: [
            {
              id: 'dashboard1',
              title: 'dashboard1',
              savedSearchId: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    filter: [
                      {
                        meta: {
                          disabled: false
                        },
                        query: {
                          match: {
                            countrycode: {
                              query: 'USA',
                              type: 'phrase'
                            }
                          }
                        }
                      },
                      {
                        query: {
                          query_string: {
                            query: 'web',
                            analyze_wildcard: true
                          }
                        }
                      }
                    ]
                  }
                )
              }
            }
          ]
        }));

        it('should store in kibistate an empty array for filters', function (done) {
          appState.filters = [];
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.have.length(0);
            done();
          }).catch(done);
        });

        it('should store in kibistate the default query', function (done) {
          const filter1 = {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          };

          appState.filters = [ filter1 ];
          appState.query = {
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          };
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.eql({
              query_string: {
                query: '*',
                analyze_wildcard: true
              }
            });
            done();
          }).catch(done);
        });
      });

      describe('Dashboard saved with default time', function () {
        beforeEach(() => init({
          savedSearches: [
            {
              id: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'index1',
                    filter: [],
                    query: {
                      query_string: {
                        query: '*'
                      }
                    }
                  }
                )
              }
            }
          ],
          savedDashboards: [
            {
              id: 'dashboard1',
              title: 'dashboard1',
              savedSearchId: 'search1',
              timeRestore: true,
              timeMode: 'absolute',
              timeFrom: defaultStartTime,
              timeTo: defaultEndTime,
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ filter: [] })
              }
            }
          ]
        }));

        it('should not store the default time', function (done) {
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
            done();
          }).catch(done);
        });
      });

      describe('Dashboard saved without time', function () {
        beforeEach(() => init({
          savedSearches: [
            {
              id: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify(
                  {
                    index: 'index1',
                    filter: [],
                    query: {
                      query_string: {
                        query: '*'
                      }
                    }
                  }
                )
              }
            }
          ],
          savedDashboards: [
            {
              id: 'dashboard1',
              title: 'dashboard1',
              savedSearchId: 'search1',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ filter: [] })
              }
            }
          ]
        }));

        it('should not store the default time', function (done) {
          kibiState.saveAppState()
          .then(() => {
            expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
            done();
          }).catch(done);
        });
      });
    });

    describe('Dashboard has modified filters', function () {
      beforeEach(() => {
        init();
        appState = new MockState({
          id: 'dashboard1',
          query: mockDecorateQuery({ query_string: { query: '*' } }),
          filters: [{
            meta: {
              index: 'article',
              formattedValue: '2,010',
              key: 'pyear',
              value: '2,010 to 2,011',
              disabled: false,
              negate: true,
              alias: null,
              dependsOnSelectedEntities: false,
              dependsOnSelectedEntitiesDisabled: false,
              markDependOnSelectedEntities: false,
              type: 'range'
            },
            range: {
              pyear: {
                gte: 2010,
                lt: 2011
              }
            },
            $state: {
              store: 'appState'
            }
          }]
        });
      });

      it('should say filters are not modified (filters against appState)', function (done) {
        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                meta: {
                  index: 'article',
                  formattedValue: '2,010',
                  key: 'pyear',
                  value: '2,010 to 2,011',
                  disabled: false,
                  negate: true,
                  alias: null,
                  dependsOnSelectedEntities: false,
                  dependsOnSelectedEntitiesDisabled: false,
                  markDependOnSelectedEntities: false
                },
                range: {
                  pyear: {
                    gte: 2010,
                    lt: 2011
                  }
                }
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(false);
        done();
      });

      it('should say filters are modified (filters against appState)', function (done) {
        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                meta: {
                  index: 'article',
                  formattedValue: '2,010',
                  key: 'pyear',
                  value: '2,010 to 2,011',
                  disabled: false,
                  negate: false,
                  alias: null,
                  dependsOnSelectedEntities: false,
                  dependsOnSelectedEntitiesDisabled: false,
                  markDependOnSelectedEntities: false
                },
                range: {
                  pyear: {
                    gte: 2010,
                    lt: 2011
                  }
                }
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(true);
        done();
      });

      it('should say query is not modified (filters against appState)', function (done) {
        appState = new MockState({
          id: 'dashboard1',
          query: mockDecorateQuery({ query_string: { query: '*' } })
        });

        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                query: mockDecorateQuery({ query_string: { query: '*' } })
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(false);
        done();
      });

      it('should say query is not modified - default query (filters against appState)', function (done) {
        appState = new MockState({
          id: 'dashboard1',
          query: mockDecorateQuery({ query_string: { query: '*' } })
        });

        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [ ]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(false);
        done();
      });

      it('should say query is modified (filters against appState)', function (done) {
        appState = new MockState({
          id: 'dashboard1',
          query: mockDecorateQuery({ query_string: { query: '*' } })
        });

        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                query: mockDecorateQuery({ query_string: { query: 'countrycode:USA' } })
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(true);
        done();
      });

      it('should say filters are modified because they were removed (filters against appState)', function (done) {
        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: []
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(true);
        done();
      });

      it('should say filters are not modified (filters against kibiState)', function (done) {
        appState = new MockState({ });
        kibiState._setDashboardProperty('dashboard1', kibiState._properties.filters, [{
          meta: {
            index: 'article',
            formattedValue: '2,010',
            key: 'pyear',
            value: '2,010 to 2,011',
            disabled: false,
            negate: true,
            alias: null,
            dependsOnSelectedEntities: false,
            dependsOnSelectedEntitiesDisabled: false,
            markDependOnSelectedEntities: false
          },
          range: {
            pyear: {
              gte: 2010,
              lt: 2011
            }
          }
        }]);

        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                meta: {
                  index: 'article',
                  formattedValue: '2,010',
                  key: 'pyear',
                  value: '2,010 to 2,011',
                  disabled: false,
                  negate: true,
                  alias: null,
                  dependsOnSelectedEntities: false,
                  dependsOnSelectedEntitiesDisabled: false,
                  markDependOnSelectedEntities: false
                },
                range: {
                  pyear: {
                    gte: 2010,
                    lt: 2011
                  }
                }
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(false);
        done();
      });

      it('should say filters are modified (filters against kibiState)', function (done) {
        appState = new MockState({ });
        kibiState._setDashboardProperty('dashboard1', kibiState._properties.filters, [{
          meta: {
            index: 'article',
            formattedValue: '2,010',
            key: 'pyear',
            value: '2,010 to 2,011',
            disabled: false,
            negate: true,
            alias: null,
            dependsOnSelectedEntities: false,
            dependsOnSelectedEntitiesDisabled: false,
            markDependOnSelectedEntities: false
          },
          range: {
            pyear: {
              gte: 2010,
              lt: 2011
            }
          }
        }, {
          term: { field1: 'ddd' },
          meta: {
            disabled: true
          }
        }]);

        const dashboard = {
          id: 'dashboard1',
          title: 'dashboard1',
          savedSearchId: 'search1',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [{
                meta: {
                  index: 'article',
                  formattedValue: '2,010',
                  key: 'pyear',
                  value: '2,010 to 2,011',
                  disabled: false,
                  negate: true,
                  alias: null,
                  dependsOnSelectedEntities: false,
                  dependsOnSelectedEntitiesDisabled: false,
                  markDependOnSelectedEntities: false
                },
                range: {
                  pyear: {
                    gte: 2010,
                    lt: 2011
                  }
                }
              }]
            })
          }
        };

        expect(kibiState.dashboardHasModifiedFilters(dashboard)).to.be(true);
        done();
      });

    });

    describe('Reset dashboards state', function () {
      beforeEach(() => init({
        pinned: [
          {
            term: { field1: 'i am pinned' },
            meta: { disabled: false }
          }
        ],
        savedDashboards: [
          {
            id: 'Articles',
            title: 'Articles',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                filter: [
                  {
                    query: {
                      query_string: {
                        query: 'torrent'
                      }
                    }
                  },
                  {
                    term: {
                      fielda: 'aaa'
                    }
                  }
                ]
              })
            }
          },
          {
            id: 'dashboard1',
            title: 'dashboard1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({ filter: [] })
            }
          },
          {
            id: 'savedFilterDashboard',
            title: 'savedFilterDashboard',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                filter: [
                  {
                    query: {
                      query_string: {
                        query: 'existingFilter',
                        analyze_wildcard: true
                      }
                    }
                  }
                ]
              })
            }
          },
          {
            id: 'time-testing-2',
            title: 'time testing 2',
            timeRestore: true,
            timeMode: 'quick',
            timeFrom: 'now-15y',
            timeTo: 'now',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({ filter:[] })
            }
          }
        ]
      }));

      it('should remove pinned filters', function (done) {
        expect(globalState.filters).to.have.length(1);
        kibiState.resetFiltersQueriesTimes().then(() => {
          sinon.assert.calledWith(disableFiltersIfOutdatedSpy, sinon.match.array, sinon.match.truthy.and(sinon.match.string));
          expect(globalState.filters).to.have.length(0);
          done();
        }).catch(done);
      });

      it('should reset times, filters and queries to their default state on all dashboards', function (done) {
        kibiState._setDashboardProperty('Articles', kibiState._properties.filters, [
          {
            term: {
              fieldb: 'bbb'
            }
          }
        ]);
        kibiState._setDashboardProperty('Articles', kibiState._properties.query, {
          query_string: {
            query: 'web'
          }
        });
        kibiState._saveTimeForDashboardId('Articles', 'quick', 'now-15m', 'now');

        kibiState._setDashboardProperty('time-testing-2', kibiState._properties.filters, [
          {
            term: {
              fieldb: 'ccc'
            }
          }
        ]);
        kibiState._setDashboardProperty('time-testing-2', kibiState._properties.query, {
          query_string: {
            query: 'ibm'
          }
        });
        kibiState._saveTimeForDashboardId('time-testing-2', 'quick', 'now-15m', 'now');

        kibiState.resetFiltersQueriesTimes().then(() => {
          sinon.assert.calledWith(disableFiltersIfOutdatedSpy, sinon.match.array, sinon.match.truthy.and(sinon.match.string));
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.filters)).to.eql([
            {
              term: {
                fielda: 'aaa'
              }
            }
          ]);
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.query)).to.eql({
            query_string: {
              query: 'torrent'
            }
          });
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.time)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.filters)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.time)).to.eql({
            m: 'quick',
            f: 'now-15y',
            t: 'now',
          });
          done();
        }).catch(done);
      });

      it('should emit a reset_app_state_query event if the query got changed', function (done) {
        const savedQuery = {
          query_string: {
            analyze_wildcard: true,
            query: 'existingFilter'
          }
        };

        appState.id = 'savedFilterDashboard';
        appState.query = {
          query_string: {
            query: 'web'
          }
        };
        kibiState._setDashboardProperty('Articles', kibiState._properties.query, {
          query_string: {
            query: 'web'
          }
        });

        kibiState.on('reset_app_state_query', function (query) {
          expect(query).to.eql(savedQuery);
          done();
        });
        kibiState.resetFiltersQueriesTimes();
      });

      it('should emit default filter if no saved filter', function (done) {
        const defaultQuery = {
          query_string: {
            analyze_wildcard: true,
            query: '*'
          }
        };

        appState.id = 'dashboard1';
        appState.query = {
          query_string: {
            query: 'web'
          }
        };
        kibiState._setDashboardProperty('Articles', kibiState._properties.query, {
          query_string: {
            query: 'web'
          }
        });

        kibiState.on('reset_app_state_query', function (query) {
          expect(query).to.eql(defaultQuery);
          done();
        });
        kibiState.resetFiltersQueriesTimes();
      });

      it('should emit a reset event with the IDs of dashboards which query got changed', function (done) {
        kibiState._setDashboardProperty('Articles', kibiState._properties.query, {
          query_string: {
            query: 'web'
          }
        });

        kibiState.on('reset', function (ids) {
          expect(ids).to.eql([ 'Articles' ]);
          done();
        });
        kibiState.resetFiltersQueriesTimes();
      });

      it('should emit a reset event with the IDs of dashboards which filters got changed', function (done) {
        kibiState._setDashboardProperty('Articles', kibiState._properties.filters, [
          {
            term: {
              fieldb: 'bbb'
            }
          }
        ]);
        kibiState._saveTimeForDashboardId('Articles', 'quick', 'now-15m', 'now');

        kibiState.on('reset', function (ids) {
          expect(ids).to.eql([ 'Articles' ]);
          done();
        });
        kibiState.resetFiltersQueriesTimes();
      });

      it('should emit a reset event with the IDs of dashboards which time got changed', function (done) {
        kibiState._saveTimeForDashboardId('Articles', 'quick', 'now-15m', 'now');

        kibiState.on('reset', function (ids) {
          expect(ids).to.eql([ 'Articles' ]);
          done();
        });
        kibiState.resetFiltersQueriesTimes();
      });

      it('should not emit a reset events if no dashboard got changed', function (done) {
        const counts = {
          reset: 0,
          reset_app_state_query: 0
        };
        sinon.stub(kibiState, 'emit', function (eventName) {
          counts[eventName]++;
        });
        kibiState.resetFiltersQueriesTimes()
        .then(() => {
          expect(Object.keys(counts).length).to.equal(2);
          expect(counts.reset).to.equal(0);
          expect(counts.reset_app_state_query).to.equal(0);
          done();
        }).catch(done);
      });
    });
  });
});
