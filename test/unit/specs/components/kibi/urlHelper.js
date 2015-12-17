define(function (require) {
  var _ = require('lodash');

  var savedDashboards = require('fixtures/saved_dashboards');
  var emptySavedDashboards = require('fixtures/empty_saved_dashboards');

  var fake_saved_dashboards = require('fixtures/fake_saved_dashboards_for_counts');
  var fake_saved_searches = require('fixtures/fake_saved_searches');

  var fake_saved_dashboards2 = require('fixtures/fake_saved_dashboards_connected');
  var fake_saved_searches2 = require('fixtures/fake_saved_searches_connected');
  var fake_timeFilter2 = require('fixtures/fake_time_filter_connected');

  var $rootScope;
  var $location;
  var $timeout;
  var config;
  var urlHelper;
  var kibiStateHelper;
  var configFile;

  function customConfigFile($provide, default_app_id, default_dashboard_id) {
    var custom = {
      'default_app_id': default_app_id,
      'default_dashboard_id': default_dashboard_id
    };
    $provide.constant('configFile', custom);
  }

  function init(default_app_id, default_dashboard_id, savedDashboardsImpl) {
    return function () {
      module('kibana', function ($provide) {
        customConfigFile($provide, default_app_id, default_dashboard_id);
      });

      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('kibana');

      _initInject();
    };
  }

  function minimalInit() {
    return function () {
      module('kibana');

      _initInject();
    };
  }


  function init2(savedDashboardsImpl, savedSearchesImpl) {
    return function () {
      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('discover/saved_searches', function ($provide) {
        $provide.service('savedSearches', savedSearchesImpl);
      });


      module('kibana');

      _initInject();
    };
  }

  function init3(savedDashboardsImpl, savedSearchesImpl, timefilterImpl) {
    return function () {
      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('discover/saved_searches', function ($provide) {
        $provide.service('savedSearches', savedSearchesImpl);
      });

      module('kibana', function ($provide) {
        $provide.service('timefilter', timefilterImpl);
      });

      module('kibana', function ($provide) {
        $provide.service('config', function () {
          var keys = {};
          return {
            get: function (key) { return keys[key]; },
            set: function (key, value) { keys[key] = value; }
          };
        });
        $provide.constant('configFile', {
          elasticsearch_plugins: [ 'FilterJoinPlugin' ]
        });
      });

      module('kibana');

      _initInject();
    };
  }


  function _initInject() {
    inject(function ($injector, Private, _$rootScope_, _$location_, _$timeout_, _config_) {
      $rootScope = _$rootScope_;
      $location = _$location_;
      $timeout = _$timeout_;
      config = _config_;

      urlHelper = Private(require('components/kibi/url_helper/url_helper'));
      kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    });
  }

  describe('Kibi Components', function () {
    describe('UrlHelper', function () {

      describe('util methods', function () {
        beforeEach(minimalInit());

        it('isDashboardInTheseRelations', function () {
          var relations = [
            {
              dashboards: [ 'A', 'B' ],
              relation: 'indexa/a/indexb/b'
            }
          ];

          expect(urlHelper.isDashboardInTheseRelations('A',  relations)).to.equal(true);
          expect(urlHelper.isDashboardInTheseRelations('B',  relations)).to.equal(true);
          expect(urlHelper.isDashboardInTheseRelations('A1', relations)).to.equal(false);
          expect(urlHelper.isDashboardInTheseRelations('A1', relations)).to.equal(false);
        });
      });


      describe('UrlHelper.getInitialPath with no arguments', function () {

        describe('for a configuration with default_dashboard_id set to Companies' +
        ' and default_app_id set to dashboard', function () {

          beforeEach(init('dashboard', 'Companies', savedDashboards));

          it('should return the correct initial path for the session', function (done) {
            urlHelper.getInitialPath().then(function (path) {
              expect(path).to.be('/dashboard/Companies');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

        describe('for a configuration with default_dashboard_id set to Article ' +
        'and default_app_id set to dashboard', function () {

          beforeEach(init('dashboard', 'Article', savedDashboards));

          it('should return the path to the first available dashboard', function (done) {
            urlHelper.getInitialPath().then(function (path) {
              expect(path).to.be('/dashboard/Articles');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

        describe('for a configuration with default_dashboard_id set to Articles, ' +
        'default_app_id set to dashboard and no dashboard defined', function () {

          beforeEach(init('dashboard', 'Articles', emptySavedDashboards));

          it('should return the path to the dashboard creation form', function (done) {
            urlHelper.getInitialPath().then(function (path) {
              expect(path).to.be('/dashboard');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

        describe('for a configuration with default_dashboard_id not set, ' +
        ' default_app_id set to dashboard and no dashboard defined', function () {

          beforeEach(init('dashboard', '', savedDashboards));

          it('should return the path to the dashboard creation form', function (done) {
            urlHelper.getInitialPath().then(function (path) {
              expect(path).to.be('/dashboard');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

        describe('for a configuration with default_dashboard_id set to Articles, ' +
        'default_app_id set to settings', function () {

          beforeEach(init('settings', 'Articles', savedDashboards));

          it('should return the the path to the settings app', function (done) {
            urlHelper.getInitialPath().then(function (path) {
              expect(path).to.be('/settings');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

      });

      describe('UrlHelper.getInitialPath(dashboardApp)', function () {

        describe('for a configuration with default_dashboard_id set to Companies' +
        ' and default_app_id set to settings', function () {

          beforeEach(init('settings', 'Companies', savedDashboards));

          it('should return the correct path', function (done) {
            var app = {
              id: 'dashboard',
              rootPath: '/dashboard',
              lastPath: '/dashboard'
            };
            urlHelper.getInitialPath(app).then(function (path) {
              expect(path).to.be('/dashboard/Companies');
              done();
            }).catch(function (error) {
              done(error);
            });
            $rootScope.$apply();
          });

        });

      });


      describe('shouldUpdateCountsBasedOnLocation', function () {
        beforeEach(minimalInit());

        it('should because filter changed', function () {
          var oldUrl = '/?_a=(filters:!())';
          var newUrl = '/?_a=(filters:!((range:())))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(true);
        });
        it('should NOT because filters are the same', function () {
          var oldUrl = '/?_a=(filters:!((range:())))';
          var newUrl = '/?_a=(filters:!((range:())))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
        });


        it('should because query changed', function () {
          var oldUrl = '/?_a=(query:())';
          var newUrl = '/?_a=(query:(match:()))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(true);
        });
        it('should NOT because queries are the same', function () {
          var oldUrl = '/?_a=(query:(match:()))';
          var newUrl = '/?_a=(query:(match:()))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
        });


        it('should Not if paths changed as it will be caught by $routeChangeSuccess event', function () {
          var oldUrl = '/pathA?_a=(filters:!((range:())))';
          var newUrl = '/pathB?_a=(filters:!((range:())))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
        });


        it('should because gloabal filter changed', function () {
          var oldUrl = '/?_g=(filters:!())';
          var newUrl = '/?_g=(filters:!((range:())))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(true);
        });
        it('should NOT because global filters are the same', function () {
          var oldUrl = '/?_g=(filters:!((range:())))';
          var newUrl = '/?_g=(filters:!((range:())))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
        });


        it('should because gloabal time changed', function () {
          var oldUrl = '/?_g=(time:())';
          var newUrl = '/?_g=(time:(range:()))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(true);
        });
        it('should NOT because global time are the same', function () {
          var oldUrl = '/?_g=(time:(range:()))';
          var newUrl = '/?_g=(time:(range:()))';
          expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
        });
      });


      describe('test methods', function () {
        beforeEach(minimalInit());

        it('removeJoinFilter', function () {
          $location.url('/?_a=(filters:!((join_set:())))');
          var expected = '/?_a=(filters:!())';
          urlHelper.removeJoinFilter();
          expect($location.url()).to.eql(expected);
        });

        it('isItDashboardUrl true', function () {
          $location.path('/dashboard/dashboard1/');
          expect(urlHelper.isItDashboardUrl()).to.equal(true);
        });

        it('isItDashboardUrl false', function () {
          $location.url('/xxx/dashboard1/');
          expect(urlHelper.isItDashboardUrl()).to.equal(false);
        });

        it('addFilter', function (done) {
          $location.url('/path/?_a=(filters:!())');
          var filter = {
            range: {
              field: {
                gte: 1,
                lte: 3
              }
            }
          };

          var expected = 'http://server/#/path/?_a=(filters:!((range:(field:(gte:1,lte:3)))))';
          urlHelper.addFilter(filter);

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('addFilter when there was no filters in the  app state', function (done) {
          $location.url('/path/?_a=()');
          var filter = {
            range: {
              field: {
                gte: 1,
                lte: 3
              }
            }
          };

          var expected = 'http://server/#/path/?_a=(filters:!((range:(field:(gte:1,lte:3)))))';
          urlHelper.addFilter(filter);

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('addFilter make sure join filter the app state', function (done) {
          $location.url('/path/?_a=(filters:!())');
          var filter = { join_set: {} };

          var expected = 'http://server/#/path/?_a=(filters:!((join_set:())))';
          urlHelper.addFilter(filter);

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('addFilter make sure join filter is replaced if present in the app state', function (done) {
          $location.url('/path/?_a=(filters:!((join_set:())))');
          var filter = { join_set: {} };

          var expected = 'http://server/#/path/?_a=(filters:!((join_set:())))';
          urlHelper.addFilter(filter);

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('replaceFiltersAndQueryAndTime _g not present', function (done) {
          $location.url('/path/?_a=(query:(query_string:(query:\'AAA\')),filters:!((join_set:())))');
          urlHelper.replaceFiltersAndQueryAndTime(
            [
              {
                join_set: {}
              }
            ],
            {
              query_string: {
                query: 'BBB'
              }
            },
            {
              from: 'now-7',
              to: 'now'
            }
          );

          var expected = 'http://server/#/path/?_a=(filters:!((join_set:())),query:(query_string:(query:BBB)))';

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('replaceFiltersAndQueryAndTime - delete query if undefined', function (done) {
          $location.url('/path/?_a=(query:(query_string:(query:\'AAA\')),filters:!((join_set:())))');
          urlHelper.replaceFiltersAndQueryAndTime(
            [
              {
                join_set: {}
              }
            ],
            undefined,
            {
              from: 'now-7',
              to: 'now'
            }
          );

          var expected = 'http://server/#/path/?_a=(filters:!((join_set:())))';

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('replaceFiltersAndQueryAndTime _g present', function (done) {
          $location.url('/path/?_g=(time:(from:\'now-1\',to:\'now\'))&' +
                        '_a=(query:(query_string:(query:\'AAA\')),filters:!((join_set:())))');
          urlHelper.replaceFiltersAndQueryAndTime(
            [
              {
                join_set: {}
              }
            ],
            {
              query_string: {
                query: 'BBB'
              }
            },
            {
              from: 'now-7',
              to: 'now'
            }
          );

          var expected = 'http://server/#/path/?_g=(time:(from:now-7,to:now))&' +
                         '_a=(filters:!((join_set:())),query:(query_string:(query:BBB)))';

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('replaceFiltersAndQueryAndTime _g not present and _a not present', function (done) {
          $location.url('/path/?');
          urlHelper.replaceFiltersAndQueryAndTime(
            [
              {
                join_set: {}
              }
            ],
            {
              query_string: {
                query: 'BBB'
              }
            },
            {
              from: 'now-7',
              to: 'now'
            }
          );

          var expected = 'http://server/#/path/';

          var off = $rootScope.$on('$locationChangeSuccess', function (event, newUrl, oldUrl) {
            off();
            expect(newUrl).to.equal(expected);
            done();
          });

          $rootScope.$apply();
        });

      });

      describe('getter methods', function () {
        beforeEach(minimalInit());

        it('getFiltersOfType join_sequence', function () {

          $location.url(
            '/?_a=(filters:!(' +
              '(join_sequence:(' +
                'meta:(disabled:!f,negate:!f,value:\'button:label1\'),' +
                'seq:!()' +
              ')),' +
              '(join_sequence:(' +
                'meta:(disabled:!f,negate:!f,value:\'button:label2\'),' +
                'seq:!()' +
              '))' +
            '))'
          );

          var expected = [
            {
              join_sequence: {
                seq: [],
                meta: {
                  disabled: false,
                  negate: false,
                  value: 'button:label1'
                }
              }
            },
            {
              join_sequence: {
                seq: [],
                meta: {
                  disabled: false,
                  negate: false,
                  value: 'button:label2'
                }
              }
            }
          ];

          var actual = urlHelper.getFiltersOfType('join_sequence');
          expect(actual).to.eql(expected);
        });


        it('getJoinFilter', function () {
          $location.url(
            '/?_a=(filters:!((join_set:(queries:(),focus:company,relations:!(!((indices:!(article),types:!(Article),path:id),' +
            '(indices:!(company),types:!(Company),path:articles)))),meta:(disabled:!f,negate:!f,value:\'button:label\'))))'
          );
          var expected = {
            join_set: {
              focus: 'company',
              queries: {},
              relations: [
                [
                  {
                    indices: [ 'article' ],
                    types: [ 'Article', ],
                    path: 'id'
                  },
                  {
                    indices: [ 'company' ],
                    types: [ 'Company', ],
                    path: 'articles'
                  }
                ]
              ]
            },
            meta: {
              disabled: false,
              negate: false,
              value: 'button:label'
            }
          };

          var actual = urlHelper.getJoinFilter();
          expect(actual).to.eql(expected);
        });

        it('getLocalParamFromUrl (empty)', function () {
          var url = 'http://localhost:5602/?_a=(filters:!())';
          var expected = {};
          var actual = urlHelper.getLocalParamFromUrl(url, 'filters');
          expect(actual).to.eql(expected);
        });

        it('getLocalParamFromUrl (?#, empty)', function () {
          var url = 'http://localhost:5602/?#/dashboard?_a=(filters:!())';
          var expected = {};
          var actual = urlHelper.getLocalParamFromUrl(url, 'filters');
          expect(actual).to.eql(expected);
        });

        it('getLocalParamFromUrl (parameters)', function () {
          var url = 'http://localhost:5602/#/dashboard/Companies?_a=(entityLabel:label,entityURI:\'sql:%2F%2Ftable%2Fid\')';
          var expected = 'label';
          var actual = urlHelper.getLocalParamFromUrl(url, 'entityLabel');
          expect(actual).to.eql(expected);
          expected = 'sql:%2F%2Ftable%2Fid';
          actual = urlHelper.getLocalParamFromUrl(url, 'entityURI');
          expect(actual).to.eql(expected);
        });

        it('getLocalParamFromUrl (?#, parameters)', function () {
          var url = 'http://localhost:5602/?#/dashboard/Companies?_a=(entityLabel:label,entityURI:\'sql:%2F%2Ftable%2Fid\')';
          var expected = 'label';
          var actual = urlHelper.getLocalParamFromUrl(url, 'entityLabel');
          expect(actual).to.eql(expected);
          expected = 'sql:%2F%2Ftable%2Fid';
          actual = urlHelper.getLocalParamFromUrl(url, 'entityURI');
          expect(actual).to.eql(expected);
        });

        it('getGlobalParamFromUrl (empty)', function () {
          var url = 'http://localhost:5602/?_g=(filters:!())';
          var expected = {};
          var actual = urlHelper.getGlobalParamFromUrl(url, 'filters');
          expect(actual).to.eql(expected);
        });

        it('getGlobalParamFromUrl (?#, empty)', function () {
          var url = 'http://localhost:5602/?#/dashboard?_g=(filters:!())';
          var expected = {};
          var actual = urlHelper.getGlobalParamFromUrl(url, 'filters');
          expect(actual).to.eql(expected);
        });

        it('getGlobalParamFromUrl (parameters)', function () {
          var url = 'http://localhost:5602/#/dashboard/Companies?_g=(entityLabel:label,entityURI:\'sql:%2F%2Ftable%2Fid\')';
          var expected = 'label';
          var actual = urlHelper.getGlobalParamFromUrl(url, 'entityLabel');
          expect(actual).to.eql(expected);
          expected = 'sql:%2F%2Ftable%2Fid';
          actual = urlHelper.getGlobalParamFromUrl(url, 'entityURI');
          expect(actual).to.eql(expected);
        });

        it('getGlobalParamFromUrl (?#, parameters)', function () {
          var url = 'http://localhost:5602/?#/dashboard/Companies?_g=(entityLabel:label,entityURI:\'sql:%2F%2Ftable%2Fid\')';
          var expected = 'label';
          var actual = urlHelper.getGlobalParamFromUrl(url, 'entityLabel');
          expect(actual).to.eql(expected);
          expected = 'sql:%2F%2Ftable%2Fid';
          actual = urlHelper.getGlobalParamFromUrl(url, 'entityURI');
          expect(actual).to.eql(expected);
        });

        it('getPathnameFromUrl', function () {
          var url = 'http://localhost:5602/#/path/?_g=(filters:!())';
          var expected = '#/path/';
          var actual = urlHelper.getPathnameFromUrl(url);
          expect(actual).to.eql(expected);
        });

        it('getPathnameFromUrl (?#)', function () {
          var url = 'http://localhost:5602/?#/path/?_g=(filters:!())';
          var expected = '#/path/';
          var actual = urlHelper.getPathnameFromUrl(url);
          expect(actual).to.eql(expected);
        });

        it('getCurrentDashboardId', function () {
          $location.path('/dashboard/dashboard1');
          expect(urlHelper.getCurrentDashboardId()).to.equal('dashboard1');
        });

        it('getCurrentDashboardId when not on dashboard', function () {
          $location.path('/notdashboard/xxx');
          expect(urlHelper.getCurrentDashboardId()).to.equal(undefined);
        });

        it('getCurrentDashboardFilters', function () {
          $location.url('/dashboard/dashboard1/?_a=(filters:!((meta:(),join_set:())))');
          var expected = [
            {
              meta:{},
              join_set: {}
            }
          ];
          expect(urlHelper.getCurrentDashboardFilters()).to.eql(expected);
        });

        it('getCurrentDashboardFilters when not on dasgboard', function () {
          $location.url('/notdashboard/XXX/?_a=(filters:!((meta:(),join_set:())))');
          expect(urlHelper.getCurrentDashboardFilters()).to.eql(undefined);
        });

        it('getCurrentDashboardQuery', function () {
          $location.url('/dashboard/dashboard1/?_a=(query:(query_string:(query:\'AAA\')))');
          var expected = {
            query_string: {
              query: 'AAA'
            }
          };
          expect(urlHelper.getCurrentDashboardQuery()).to.eql(expected);
        });

        it('getCurrentDashboardQuery when not in dashboard', function () {
          $location.url('/notdashboard/dashboard1/?_a=(query:(query_string:(query:\'AAA\')))');
          expect(urlHelper.getCurrentDashboardQuery()).to.eql(undefined);
        });

      });

      describe('methods which maps indexes to dashboards', function () {
        beforeEach(init2(fake_saved_dashboards, fake_saved_searches));

        it('getIndexToDashboardMap', function (done) {
          var expected = {
            'time-testing-4': ['time-testing-4']
          };

          urlHelper.getIndexToDashboardMap().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('getIndexToDashboardMap pass ids of dashboards', function (done) {
          var expected = {
            'time-testing-4': ['time-testing-4']
          };

          urlHelper.getIndexToDashboardMap(['time-testing-4']).then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });



        it('getRegularFiltersPerIndex', function (done) {
          var expected = {
            'time-testing-4': []
          };

          urlHelper.getRegularFiltersPerIndex().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('getQueriesPerIndex', function (done) {
          var expected = {};

          urlHelper.getQueriesPerIndex().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('getRegularFiltersPerIndex - with a filter in the kibi state', function (done) {
          kibiStateHelper.saveFiltersForDashboardId('time-testing-4', [
            {
              range: {}
            }
          ]);
          var expected = {
            'time-testing-4': [
              {
                range: {}
              }
            ]
          };

          urlHelper.getRegularFiltersPerIndex().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('getRegularFiltersPerIndex - with a join in the kibi state', function (done) {
          kibiStateHelper.saveFiltersForDashboardId('time-testing-4', [
            {
              join_set: {}
            }
          ]);
          var expected = {
            'time-testing-4': []
          };

          urlHelper.getRegularFiltersPerIndex().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('getQueriesPerIndex - with a query', function (done) {
          kibiStateHelper.saveQueryForDashboardId('time-testing-4', {
            query_string: {}
          });
          var expected = {
            'time-testing-4':[{
              query_string: {}
            }]
          };

          urlHelper.getQueriesPerIndex().then(function (results) {
            expect(results).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


      });

      describe('getFiltersFromDashboardsWithSameIndex', function () {

        beforeEach(init3(fake_saved_dashboards2, fake_saved_searches2, fake_timeFilter2));

        it('should be empty as relational panel is disabled', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };
          config.set('kibi:relationalPanel', false);
          urlHelper.getFiltersFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (filters) {
            expect(filters).to.eql([]);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

        it('should be empty as relational panel is enabled but no relations', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', { relationsDashboards: [] });
          urlHelper.getFiltersFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (filters) {
            expect(filters).to.eql([]);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

        it('should NOT be empty as relational panel is enabled and there is a relation', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };

          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', {
            relationsDashboards: [
              {
                dashboards: [ 'Articles2', 'Companies' ],
                relation: 'article/companyid/company/id'
              }
            ]
          });
          kibiStateHelper.enableRelation('article/companyid/company/id');
          // now add a filter on Articles2
          kibiStateHelper.saveFiltersForDashboardId('Articles2', [{term : { user : 'FOO_FILTER'}}]);

          var expected = [
            {term : { user : 'FOO_FILTER'}}, // comes from kibi state
            {term : { user : 'BAR_FILTER'}}, // comes from saved search meta
            // comes from the fact that there is a time filter for this dashboard
            {
              range: {
                fake_field: {
                  gte: 20,
                  lte: 40
                }
              }
            },
          ];

          urlHelper.getFiltersFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (filters) {
            expect(filters).to.eql(expected);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

      });


      describe('getQueriesFromDashboardsWithSameIndex', function () {

        beforeEach(init3(fake_saved_dashboards2, fake_saved_searches2, fake_timeFilter2));

        it('should be empty as relational panel is disabled', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };
          config.set('kibi:relationalPanel', false);
          urlHelper.getQueriesFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (queries) {
            expect(queries).to.eql([]);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

        it('should be empty as relational panel is enabled but no relations', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', { relationsDashboards: [] });
          urlHelper.getQueriesFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (queries) {
            expect(queries).to.eql([]);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

        it('should NOT be empty as relational panel is enabled and there is a relation', function (done) {
          var dashboardId = 'Articles1';
          var indexPattern = {
            id: 'articles'
          };

          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', {
            relationsDashboards: [
              {
                dashboards: [ 'Articles2', 'Companies' ],
                relation: 'article/companyid/company/id'
              }
            ]
          });
          kibiStateHelper.enableRelation('article/companyid/company/id');
          // now add a filter on Articles2
          kibiStateHelper.saveQueryForDashboardId('Articles2', {query: {query_string: {query: 'FOO_QUERY'}}});

          var expected = [
            {query: {query_string: {query: 'FOO_QUERY'}}}, // comes from kibi state
            {query: {query_string: {query: 'BAR_QUERY'}}}  // comes from saved search meta
          ];

          urlHelper.getQueriesFromDashboardsWithSameIndex(dashboardId, indexPattern).then(function (queries) {
            expect(queries).to.eql(expected);
            done();
          }).catch(done);
          $rootScope.$apply();
        });

      });

    });
  });
});
