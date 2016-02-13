var expect = require('expect.js');
var ngMock = require('ngMock');

var sinon = require('auto-release-sinon');
var fakeSavedVisualisations = require('fixtures/kibi/saved_visualisations');
var fakeSavedDashboardGroups = require('fixtures/kibi/fake_saved_dashboard_groups');
var deleteHelper;

describe('Kibi Components', function () {
  describe('deleteHelper', function () {
    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardId', '');
        $provide.constant('elasticsearchPlugins', []);
      });

      ngMock.module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
        $provide.service('savedDashboardGroups', fakeSavedDashboardGroups);
      });

      ngMock.module('app/visualize', function ($provide) {
        $provide.service('savedVisualizations', fakeSavedVisualisations);
      });

      ngMock.inject(function (Private) {
        deleteHelper = Private(require('ui/kibi/helpers/delete_helper'));
      });
    });


    require('testUtils/noDigestPromises').activateForSuite();

    it('should call the delegated delete method method if the service is neither a query nor a dashboard', function () {
      var spy = sinon.spy();

      deleteHelper.deleteByType('aaa', null, spy);
      expect(spy.called).to.be(true);
    });

    it('should call the delegated delete method method if the query is not used by any visualisations', function (done) {
      var spy = sinon.spy();

      deleteHelper.deleteByType('query', [ '666' ], spy).then(function () {
        expect(spy.called).to.be(true);
        done();
      });
    });

    it('should not delete query that is used by a visualisation', function (done) {
      var spy = sinon.spy();
      var stub = sinon.stub(window, 'alert', function () { return false; });

      deleteHelper.deleteByType('query', [ '123' ], spy).then(function () {
        expect(spy.called).to.be(false);
        done();
      });
    });

    it('should call the delegated delete method method if the dashboard is not in any group', function (done) {
      var spy = sinon.spy();

      deleteHelper.deleteByType('dashboard', [ 'dashboard 666' ], spy).then(function () {
        expect(spy.called).to.be(true);
        done();
      });
    });

    it('should not delete dashboard that is in a group', function (done) {
      var spy = sinon.spy();
      var stub = sinon.stub(window, 'alert', function () { return false; });

      deleteHelper.deleteByType('dashboard', [ 'Companies' ], spy).then(function () {
        expect(spy.called).to.be(false);
        done();
      });
    });
  });
});
