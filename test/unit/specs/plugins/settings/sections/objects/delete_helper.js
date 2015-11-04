define(function (require) {

  var sinon = require('test_utils/auto_release_sinon');
  var fakeSavedVisualisations = require('fixtures/saved_visualisations');
  var fakeSavedDashboardGroups = require('fixtures/fake_saved_dashboard_groups');
  var deleteHelper;

  describe('Kibi Components', function () {
    describe('deleteHelper', function () {
      beforeEach(function () {
        module('kibana');

        module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
          $provide.service('savedDashboardGroups', fakeSavedDashboardGroups);
        });

        module('app/visualize', function ($provide) {
          $provide.service('savedVisualizations', fakeSavedVisualisations);
        });

        inject(function (Private) {
          deleteHelper = Private(require('plugins/settings/sections/objects/delete_helper'));
        });
      });


      require('test_utils/no_digest_promises').activateForSuite();

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
});
