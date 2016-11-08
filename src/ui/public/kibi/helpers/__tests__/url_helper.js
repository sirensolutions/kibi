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
      $provide.constant('kibiDefaultDashboardTitle', defaultDashboardId);
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards));
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

  });
});
