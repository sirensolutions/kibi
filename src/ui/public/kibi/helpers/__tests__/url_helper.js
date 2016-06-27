var expect = require('expect.js');
var ngMock = require('ngMock');
var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');

var urlHelper;

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

function init(kbnDefaultAppId = '', defaultDashboardId = '', savedDashboards = []) {
  return () => {
    ngMock.module('kibana', ($provide) => {
      $provide.constant('kbnDefaultAppId', kbnDefaultAppId);
      $provide.constant('kibiDefaultDashboardId', defaultDashboardId);
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
    });

    ngMock.inject(function (Private) {
      urlHelper = Private(require('ui/kibi/helpers/url_helper'));
    });
  };
}

describe('Kibi Components', function () {
  describe('UrlHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

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

    describe('getter methods', function () {
      beforeEach(init());

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

  });
});
