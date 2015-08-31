define(function (require) {
  var _ = require('lodash');

  var savedDashboards = require('fixtures/saved_dashboards');
  var emptySavedDashboards = require('fixtures/empty_saved_dashboards');

  var $rootScope;
  var UrlHelper;
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

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        UrlHelper = Private(require('components/sindicetech/urlHelper/urlHelper'));
      });
    };
  }

  describe('Kibi Components', function () {

    describe('UrlHelper.getInitialPath with no arguments', function () {

      describe('for a configuration with default_dashboard_id set to Companies' +
      ' and default_app_id set to dashboard', function () {

        beforeEach(init('dashboard', 'Companies', savedDashboards));

        it('should return the correct initial path for the session', function (done) {
          UrlHelper.getInitialPath().then(function (path) {
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
          UrlHelper.getInitialPath().then(function (path) {
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
          UrlHelper.getInitialPath().then(function (path) {
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
          UrlHelper.getInitialPath().then(function (path) {
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
          UrlHelper.getInitialPath().then(function (path) {
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
          UrlHelper.getInitialPath(app).then(function (path) {
            expect(path).to.be('/dashboard/Companies');
            done();
          }).catch(function (error) {
            done(error);
          });
          $rootScope.$apply();
        });

      });

    });

  });
});
