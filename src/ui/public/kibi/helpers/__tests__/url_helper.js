var _ = require('lodash');
var MockState = require('fixtures/mock_state');
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
var fakeSavedDashboards = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'search-ste',
    title: 'search-ste',
    savedSearchId: 'search-ste'
  },
  {
    id: 'time-testing-4',
    title: 'time-testing-4',
    timeRestore: true,
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z',
    savedSearchId: 'time-testing-4'
  }
];
var fakeSavedSearches = [
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
  },
  {
    id: 'time-testing-4',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'time-testing-4', // here put this id to make sure fakeTimeFilter will supply the timfilter for it
          filter: [],
          query: {}
        }
      )
    }
  }
];

var fakeSavedDashboards2 = [
  {
    id: 'Persons',
    title: 'Persons',
    savedSearchId: 'saved-search-person'
  },
  {
    id: 'Articles0',
    title: 'Articles0',
    savedSearchId: 'saved-search-articles0'
  },
  {
    id: 'Articles1',
    title: 'Articles1',
    savedSearchId: 'saved-search-articles1'
  },
  {
    id: 'Articles2',
    title: 'Articles2',
    savedSearchId: 'saved-search-articles2'
  },
  {
    id: 'Companies',
    title: 'Companies',
    savedSearchId: 'saved-search-companies'
  },
  {
    id: 'No Saved Search',
    title: 'No Saved Search'
  }
];
var fakeSavedSearches2 = [
  {
    id: 'saved-search-articles0',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'articles',
          filter: [
            {
              term: {
                user: 'filter0'
              }
            }
          ],
          query: {
            query: {
              query_string: {
                query: 'query0'
              }
            }
          }
        }
      )
    }
  },
  {
    id: 'saved-search-articles1',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'articles',
          filter: [],
          query: {}
        }
      )
    }
  },
  {
    id: 'saved-search-articles2',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'articles',
          filter: [
            {
              term: {
                user: 'BAR_FILTER'
              }
            }
          ],
          query: {
            query: {
              query_string: {
                query: 'BAR_QUERY'
              }
            }
          }
        }
      )
    }
  },
  {
    id: 'saved-search-person',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'person',
          filter: [
            {
              term: {
                user: 'person'
              }
            }
          ],
          query: {
            query: {
              query_string: {
                query: 'person'
              }
            }
          }
        }
      )
    }
  },
  {
    id: 'saved-search-companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'company',
          filter: [
            {
              term: {
                user: 'company'
              }
            }
          ],
          query: {
            query: {
              query_string: {
                query: 'company'
              }
            }
          }
        }
      )
    }
  }
];
var fakeTimeFilter2 = require('fixtures/kibi/fake_time_filter_connected');

var $rootScope;
var config;
var urlHelper;
var kibiStateHelper;
var configFile;
var chrome = require('ui/chrome');
var chromeStub;
var appState;
var globalState;

var kibanaAppStub = {
  id: 'kibana',
  url: 'http://localhost:5601/app/kibana'
};

var settingsStub = [
  {
    active: true,
    id: 'settings',
    lastUrl: '/settings/LastSettingsUrl',
    rootUrl: '/settings'
  }
];
var dashboardStub = [
  {
    active: true,
    id: 'dashboard',
    lastUrl: '/dashboard/LastDashboardUrl',
    rootUrl: '/dashboard'
  }
];


var sinon = require('auto-release-sinon');

function init(kbnDefaultAppId = '', defaultDashboardId = '', savedDashboards = [], savedSearches = [], timefilterImpl,
              currentDashboardId = 'myDashboard', currentPath = '/dashboard') {
  return () => {
    ngMock.module(
      'kibana',
      'kibana/courier',
      'kibana/global_state',
      ($provide) => {
        $provide.constant('kbnDefaultAppId', kbnDefaultAppId);
        $provide.constant('kibiDefaultDashboardId', defaultDashboardId);

        $provide.service('$route', () => {
          var myRoute = {
            current: {
              $$route: {
                originalPath: currentPath
              },
              locals: {
                dash: {
                  id: currentDashboardId
                }
              }
            }
          };
          if (currentPath === null) {
            delete myRoute.current.$$route;
          } else if (currentDashboardId === null) {
            delete myRoute.current.locals;
          }
          return myRoute;
        });

        appState = new MockState({ filters: [] });
        $provide.service('getAppState', () => {
          return function () { return appState; };
        });

        globalState = new MockState({ filters: [] });
        $provide.service('globalState', () => {
          return globalState;
        });

        if (timefilterImpl) {
          $provide.service('timefilter', timefilterImpl);
        }

        $provide.service('config', require('fixtures/kibi/config'));
      }
    );

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
    });

    ngMock.inject(function (Private, _$rootScope_, _config_) {
      $rootScope = _$rootScope_;
      config = _config_;

      chromeStub = sinon.stub(chrome, 'getTabs');
      urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('UrlHelper', function () {

    describe('util methods', function () {
      beforeEach(init());

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

    describe('getDashboardAndSavedSearchMetas', function () {
      beforeEach(init('', '', fakeSavedDashboards, fakeSavedSearches));

      require('testUtils/noDigestPromises').activateForSuite();

      it('get saved dashboard and saved search', function (done) {
        urlHelper.getDashboardAndSavedSearchMetas([ 'search-ste' ]).then(function (results) {
          expect(results).to.have.length(1);
          expect(results[0].savedDash.id).to.be('search-ste');
          expect(results[0].savedSearchMeta.index).to.be('search-ste');
          done();
        }).catch(done);
      });

      it('should reject promise if saved search is missing for dashboard', function (done) {
        urlHelper.getDashboardAndSavedSearchMetas([ 'Articles' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('The dashboard [Articles] is expected to be associated with a saved search.');
          done();
        });
      });

      it('should reject promise if an unknown dashboard is requested', function (done) {
        urlHelper.getDashboardAndSavedSearchMetas([ 'search-ste', 'unknown dashboard' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          try {
            expect(err.message).to.be('Unable to retrieve dashboards: ["unknown dashboard"].');
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });

    // There can not possibly be such situation now
    // as to see anything kibana app has to be set
    describe('UrlHelper.getInitialPath(app == kibana, tabs)', function () {

      describe('defaultDashboardId == Companies, kbnDefaultAppId == dashboard', function () {

        beforeEach(init('dashboard', 'Companies', savedDashboards));

        it('should return the correct initial path for the session', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, dashboardStub).then(function (path) {
            expect(path).to.be('/dashboard/Companies');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

      describe('defaultDashboardId == Article, kbnDefaultAppId == dashboard', function () {

        beforeEach(init('dashboard', 'Article', savedDashboards));

        it('should return the path to the first available dashboard', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, dashboardStub).then(function (path) {
            expect(path).to.be('/dashboard/Articles');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

      describe('defaultDashboardId not set, kbnDefaultAppId == dashboard and there are dashboards', function () {

        beforeEach(init('dashboard', '', savedDashboards));

        it('2 should return the path to the first dashboard (Articles) /dashboard/Articles', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, dashboardStub).then(function (path) {
            expect(path).to.be('/dashboard/Articles');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

      describe('defaultDashboardId == Articles, and kbnDefaultAppId == dashboard and no dashboard defined', function () {

        beforeEach(init('dashboard', 'Articles'));

        it('1 should return the path to the dashboard creation form', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, dashboardStub).then(function (path) {
            expect(path).to.be('/dashboard');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

      describe('defaultDashboardId not set, kbnDefaultAppId == dashboard and no dashboard defined', function () {

        beforeEach(init('dashboard', ''));

        it('2 should return the path to the dashboard creation form /dashboard', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, dashboardStub).then(function (path) {
            expect(path).to.be('/dashboard');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

      describe('defaultDashboardId == Articles, kbnDefaultAppId == settings', function () {

        beforeEach(init('settings', 'Articles', savedDashboards));

        it('should return the the path to the settings app /settings/LastSettingsUrl', function (done) {

          urlHelper.getInitialPath(kibanaAppStub, settingsStub).then(function (path) {
            expect(path).to.be('/settings/LastSettingsUrl');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

    });

    describe('UrlHelper.getInitialPath(app == kibana)', function () {

      describe('defaultDashboardId == Companies, kbnDefaultAppId == settings', function () {

        beforeEach(init('settings', 'Companies', savedDashboards));

        it('should return the correct path /settings', function (done) {
          urlHelper.getInitialPath(kibanaAppStub).then(function (path) {
            expect(path).to.be('/settings');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

    });


    describe('shouldUpdateCountsBasedOnLocation', function () {
      beforeEach(init());

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


      it('should because global filter changed', function () {
        var oldUrl = '/?_g=(filters:!())';
        var newUrl = '/?_g=(filters:!((range:())))';
        expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(true);
      });
      it('should NOT because global filters are the same', function () {
        var oldUrl = '/?_g=(filters:!((range:())))';
        var newUrl = '/?_g=(filters:!((range:())))';
        expect(urlHelper.shouldUpdateCountsBasedOnLocation(oldUrl, newUrl)).to.equal(false);
      });


      it('should because global time changed', function () {
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

    describe('isItDashboardUrl', function () {
      it('isItDashboardUrl true', function () {
        init()();
        expect(urlHelper.isItDashboardUrl()).to.equal(true);
      });

      it('isItDashboardUrl false', function () {
        init('', '', [], [], null, '', '/xxx/sss')();
        expect(urlHelper.isItDashboardUrl()).to.equal(false);
      });
    });

    describe('removeJoinFilter', function () {
      beforeEach(init());

      it('removeJoinFilter', function () {
        appState.filters = [
          {
            join_set: {}
          }
        ];

        kibiStateHelper.saveFiltersForDashboardId('myDashboard', [
          {
            join_set: {}
          }
        ]);

        expect(appState.filters).to.have.length(1);
        expect(kibiStateHelper.getFiltersForDashboardId('myDashboard')).to.have.length(1);

        urlHelper.removeJoinFilter('myDashboard');

        expect(appState.filters).to.have.length(0);
        expect(kibiStateHelper.getFiltersForDashboardId('myDashboard')).to.have.length(0);
      });
    });

    describe('addFilter', function () {
      beforeEach(init());

      it('adds filter in appstate and kibistate', function () {
        var filter = {
          range: {
            field: {
              gte: 1,
              lte: 3
            }
          }
        };

        urlHelper.addFilter('myDashboard', filter);

        expect(appState.filters).to.eql([ filter ]);
        expect(kibiStateHelper.getFiltersForDashboardId('myDashboard')).to.eql([ filter ]);
      });

      it('make sure to replace join filter in the app state', function () {
        var filter = { join_set: { a: 1 } };
        appState.filters = [
          {
            join_set: {}
          }
        ];
        var expected = [
          {
            join_set: { a: 1 }
          }
        ];

        urlHelper.addFilter('myDashboard', filter);

        expect(appState.filters).to.eql(expected);
        expect(kibiStateHelper.getFiltersForDashboardId('myDashboard')).to.eql(expected);
      });
    });

    describe('getter methods', function () {
      beforeEach(init());

      it('getFiltersOfType join_sequence', function () {
        appState.filters = [
          {
            terms: {}
          },
          {
            join_sequence: {
              meta: {
                disabled: false,
                negate: false,
                value: 'button:label2'
              },
              seq: []
            }
          }
        ];

        var expected = [
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

        var actual = urlHelper.getFiltersOfType('myDashboard', 'join_sequence');
        expect(actual).to.eql(expected);
      });

      it('getJoinFilter', function () {
        appState.filters = [
          {
            terms: {}
          },
          {
            join_set: {
              queries: {},
              focus: 'company',
              relations: [
                [
                  {
                    indices: [ 'article' ],
                    types: [ 'Article' ],
                    path: 'id'
                  },
                  {
                    indices: [ 'company' ],
                    types: [ 'Company' ],
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
          }
        ];

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

        var actual = urlHelper.getJoinFilter('myDashboard');
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

    });

    describe('get dashboard filters or query', function () {
      beforeEach(init());

      it('getDashboardFilters from appState', function () {
        var expected = [
          {
            meta:{},
            join_set: {}
          }
        ];

        appState.filters = [
          {
            meta: {},
            join_set: {}
          }
        ];
        expect(urlHelper.getDashboardFilters('myDashboard')).to.eql(expected);
      });

      it('getDashboardFilters from kibi state', function () {
        var expected = [
          {
            meta:{},
            join_set: {}
          }
        ];

        kibiStateHelper.saveFiltersForDashboardId('Persons', [
          {
            meta: {},
            join_set: {}
          }
        ]);

        expect(urlHelper.getDashboardFilters('Persons')).to.eql(expected);
        expect(appState.filters).to.have.length(0);
      });

      it('getDashboardQuery from appState', function () {
        var query = {
          query_string: {
            query: 'AAA'
          }
        };

        appState.query = query;
        expect(urlHelper.getDashboardQuery('myDashboard')).to.eql(query);
      });

      it('getDashboardQuery from kibi state', function () {
        kibiStateHelper.saveQueryForDashboardId('something', {
          query_string: {
            query: 'BBB'
          }
        });
        appState.query = {
          query_string: {
            query: 'AAA'
          }
        };
        expect(urlHelper.getDashboardQuery('something')).to.eql({
          query_string: {
            query: 'BBB'
          }
        });
      });
    });

    describe('getCurrentDashboardId', function () {
      it('getCurrentDashboardId', function () {
        init('', '', [], [], null, 'dashboard1')();
        expect(urlHelper.getCurrentDashboardId()).to.equal('dashboard1');
      });

      it('getCurrentDashboardId when not on dashboard', function () {
        init('', '', [], [], null, null, '/notdashboard/xxx')();
        expect(urlHelper.getCurrentDashboardId()).to.equal(undefined);
      });
    });

    describe('methods which maps indexes to dashboards', function () {
      beforeEach(init('', '', fakeSavedDashboards, fakeSavedSearches));

      it(
        'getIndexToDashboardMap should fail because a dashboard does not have a saved search ' +
        'and ignoreMissingSavedSearch not set', function (done) {
          urlHelper.getIndexToDashboardMap().then(function (results) {
            done('should fail');
          }).catch(function (err) {
            expect(err.message).to.be('The dashboard [Articles] is expected to be associated with a saved search.');
            done();
          });

          $rootScope.$apply();
        }
      );

      it(
        'getIndexToDashboardMap should NOT fail because a dashboard does not have a saved search ' +
        'but ignoreMissingSavedSearch set to true and first parameter empty', function (done) {
          var expected = {
            'search-ste': ['search-ste'],
            'time-testing-4': ['time-testing-4']
          };

          urlHelper.getIndexToDashboardMap(null, true).then(function (results) {
            expect(results, expected);
            done();
          }).catch(done);

          $rootScope.$apply();
        }
      );

      it(
        'getIndexToDashboardMap should NOT fail because a dashboard does not have a saved search ' +
        'but ignoreMissingSavedSearch set to true and first parameter is array of ids', function (done) {
          var expected = {
            'time-testing-4': ['time-testing-4']
          };

          urlHelper.getIndexToDashboardMap(['time-testing-4'], true).then(function (results) {
            expect(results, expected);
            done();
          }).catch(done);

          $rootScope.$apply();
        }
      );

      it('getIndexToDashboardMap pass ids of dashboards', function (done) {
        var expected = {
          'time-testing-4': ['time-testing-4']
        };

        urlHelper.getIndexToDashboardMap(['time-testing-4']).then(function (results) {
          expect(results).to.eql(expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('dashboard is not selected but has a savedsearch', function (done) {
        var expected = {
          'search-ste': ['search-ste']
        };

        urlHelper.getIndexToDashboardMap(['search-ste']).then(function (results) {
          expect(results).to.eql(expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });
    });

    describe('filters and queries per index from a set of dashboards', function () {

      beforeEach(init('', '', fakeSavedDashboards2, fakeSavedSearches2, fakeTimeFilter2));

      function compareObjectsWithArrays(results, expected) {
        const cmp = function (a, b) {
          const astr = JSON.stringify(a, null, ' ');
          const bstr = JSON.stringify(b, null, ' ');

          return astr.localeCompare(bstr);
        };

        const sortedResults = _.mapValues(results, (filters) => {
          filters.sort(cmp);
          return filters;
        });
        const sortedExpected = _.mapValues(expected, (filters) => {
          filters.sort(cmp);
          return filters;
        });
        expect(sortedResults).to.eql(sortedExpected);
      }

      it('getFiltersPerIndexFromDashboards - with a filter in the kibi state', function (done) {
        kibiStateHelper.saveFiltersForDashboardId('Persons', [
          {
            range: {}
          }
        ]);

        var expected = {
          articles: [
            // from the saved search of Articles0
            {
              term: { user: 'filter0'}
            },
            // from the saved search of Articles2
            {
              term: { user: 'BAR_FILTER'}
            },
            // from the time filter
            {
              range: {
                fake_field: {
                  gte: 20,
                  lte: 40
                }
              }
            }
          ],
          person: [
            // from the saved search of Persons
            {
              term: { user: 'person'}
            },
            // from the filter saved in the dashboard Persons
            {
              range: {}
            }
          ]
        };

        urlHelper.getFiltersPerIndexFromDashboards([ 'Articles0', 'Persons', 'Articles2' ]).then(function (results) {
          compareObjectsWithArrays(results, expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('getFiltersPerIndexFromDashboards - with a join in the kibi state', function (done) {
        kibiStateHelper.saveFiltersForDashboardId('Persons', [
          {
            join_set: {}
          }
        ]);
        var expected = {
          articles: [
            // from the saved search of Articles0
            {
              term: { user: 'filter0'}
            },
            // from the saved search of Articles2
            {
              term: { user: 'BAR_FILTER'}
            },
            // from the time filter
            {
              range: {
                fake_field: {
                  gte: 20,
                  lte: 40
                }
              }
            }
          ],
          person: [
            // from the saved search of Persons
            {
              term: { user: 'person'}
            }
          ]
        };

        urlHelper.getFiltersPerIndexFromDashboards([ 'Articles0', 'Articles2', 'Persons' ]).then(function (results) {
          compareObjectsWithArrays(results, expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('getQueriesPerIndexFromDashboards', function (done) {
        var expected = {
          articles: [
            // from the saved search of Articles0
            {
              query: {
                query_string: { query: 'query0' }
              }
            },
            // from the saved search of Articles2
            {
              query: {
                query_string: { query: 'BAR_QUERY' }
              }
            }
          ],
          person: [
            // from the saved search of Persons
            {
              query: {
                query_string: { query: 'person' }
              }
            }
          ]
        };

        urlHelper.getQueriesPerIndexFromDashboards([ 'Articles0', 'Persons', 'Articles2' ]).then(function (results) {
          compareObjectsWithArrays(results, expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });

      it('getQueriesPerIndexFromDashboards - with a query', function (done) {
        kibiStateHelper.saveQueryForDashboardId('articles', {
          query: {
            query_string: { query: 'BAR_QUERY' }
          }
        });
        var expected = {
          articles: [
            // from the saved search of Articles0
            {
              query: {
                query_string: { query: 'query0' }
              }
            },
            // from the saved search of Articles2 and saved search
            {
              query: {
                query_string: { query: 'BAR_QUERY' }
              }
            }
          ],
          person: [
            // from the saved search of Persons
            {
              query: {
                query_string: { query: 'person' }
              }
            }
          ]
        };

        urlHelper.getQueriesPerIndexFromDashboards([ 'Articles0', 'Persons', 'Articles2' ]).then(function (results) {
          compareObjectsWithArrays(results, expected);
          done();
        }).catch(done);

        $rootScope.$apply();
      });
    });

    describe('getFiltersFromDashboardsWithSameIndex', function () {
      beforeEach(init('', '', fakeSavedDashboards2, fakeSavedSearches2, fakeTimeFilter2));

      it('should be empty as relational panel is disabled', function (done) {
        config.set('kibi:relationalPanel', false);
        urlHelper.getFiltersFromDashboardsWithSameIndex('Articles1').then(function (filters) {
          expect(filters).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should be empty as relational panel is enabled but no relations', function (done) {
        config.set('kibi:relationalPanel', true);
        config.set('kibi:relations', { relationsDashboards: [] });
        urlHelper.getFiltersFromDashboardsWithSameIndex('Articles1').then(function (filters) {
          expect(filters).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should NOT be empty as relational panel is enabled and dashboards are part of an enabled relation', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash1 = {
          dashboards: [ 'Articles1', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        var relDash2 = {
          dashboards: [ 'Articles2', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash1, relDash2 ] });
        kibiStateHelper.enableRelation(relDash1);
        kibiStateHelper.enableRelation(relDash2);
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
          }
        ];

        urlHelper.getFiltersFromDashboardsWithSameIndex('Articles1').then(function (filters) {
          expect(filters).to.eql(expected);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should be empty as relational panel is enabled and the dashboard is not part of the enabled relations', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash = {
          dashboards: [ 'Articles2', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        config.set('kibi:relations', {
          relationsDashboards: [
            {
              dashboards: [ 'Articles1', 'Companies' ],
              relation: 'article/companyid/company/id'
            },
            relDash
          ]
        });
        kibiStateHelper.enableRelation(relDash);

        urlHelper.getFiltersFromDashboardsWithSameIndex('Articles1').then(function (filters) {
          expect(filters).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should be empty as relational panel is enabled and the dashboard is the only one with index company', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash = {
          dashboards: [ 'Articles2', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        config.set('kibi:relations', {
          relationsDashboards: [
            {
              dashboards: [ 'Articles1', 'Companies' ],
              relation: 'article/companyid/company/id'
            },
            relDash
          ]
        });
        kibiStateHelper.enableRelation(relDash);

        urlHelper.getFiltersFromDashboardsWithSameIndex('Companies').then(function (filters) {
          expect(filters).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });
    });


    describe('getQueriesFromDashboardsWithSameIndex', function () {

      beforeEach(init('', '', fakeSavedDashboards2, fakeSavedSearches2, fakeTimeFilter2));

      it('should be empty as relational panel is disabled', function (done) {
        config.set('kibi:relationalPanel', false);
        urlHelper.getQueriesFromDashboardsWithSameIndex('Articles1').then(function (queries) {
          expect(queries).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should be empty as relational panel is enabled but no relations', function (done) {
        config.set('kibi:relationalPanel', true);
        config.set('kibi:relations', { relationsDashboards: [] });
        urlHelper.getQueriesFromDashboardsWithSameIndex('Articles1').then(function (queries) {
          expect(queries).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should NOT be empty as relational panel is enabled and dashboards are part of an enabled relation', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash1 = {
          dashboards: [ 'Articles1', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        var relDash2 = {
          dashboards: [ 'Articles2', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash1, relDash2 ] });
        kibiStateHelper.enableRelation(relDash1);
        kibiStateHelper.enableRelation(relDash2);
        // now add a query on Articles2
        kibiStateHelper.saveQueryForDashboardId('Articles2', {query: {query_string: {query: 'FOO_QUERY'}}});

        var expected = [
          {query: {query_string: {query: 'FOO_QUERY'}}}, // comes from kibi state
          {query: {query_string: {query: 'BAR_QUERY'}}}  // comes from saved search meta
        ];

        urlHelper.getQueriesFromDashboardsWithSameIndex('Articles1').then(function (queries) {
          expect(queries).to.eql(expected);
          done();
        }).catch(done);
        $rootScope.$apply();
      });

      it('should be empty as relational panel is enabled and the dashboard is not part of the enabled relations', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash = {
          dashboards: [ 'Articles2', 'Companies' ],
          relation: 'article/companyid/company/id'
        };
        config.set('kibi:relations', {
          relationsDashboards: [
            {
              dashboards: [ 'Articles1', 'Companies' ],
              relation: 'article/companyid/company/id'
            },
            relDash
          ]
        });
        kibiStateHelper.enableRelation(relDash);

        urlHelper.getQueriesFromDashboardsWithSameIndex('Articles1').then(function (queries) {
          expect(queries).to.eql([]);
          done();
        }).catch(done);
        $rootScope.$apply();
      });
    });

  });
});
