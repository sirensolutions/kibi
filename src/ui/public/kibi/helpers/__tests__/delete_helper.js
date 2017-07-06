var expect = require('expect.js');
var ngMock = require('ngMock');

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var sinon = require('auto-release-sinon');
var fakeSavedVisualisations = [
  {
    id: 'myvis1',
    title: 'myvis1',
    visState: '{"params":{"queryIds":[{"id":"","queryId":"123","queryVariableName":"competitor"}]}}',
    description: '',
    savedSearchId: 'Articles',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    }
  },
  {
    id: 'myvis2',
    title: 'myvis2',
    visState: '{"params":{"queryIds":[{"queryId":"123"},{"queryId":"456"}]}}',
    description: '',
    savedSearchId: 'Articles',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    }
  }
];
var fakeSavedDashboardGroups = [
  {
    id: 'group-1',
    title: 'Group 1',
    priority: 1,
    dashboards: [
      {
        title: 'Companies',
        id: 'Companies'
      },
      {
        id: 'Articles',
        title: 'Articles'
      }
    ]
  },
  {
    id: 'group-2',
    title: 'Group 2',
    priority: 2,
    dashboards: []
  }
];
var deleteHelper;

describe('Kibi Components', function () {
  describe('deleteHelper', function () {
    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kibiEnterpriseEnabled', false);
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('elasticsearchPlugins', []);
      });

      ngMock.module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
        $provide.service('savedDashboardGroups', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedDashboardGroups', fakeSavedDashboardGroups);
        });
      });

      ngMock.module('app/visualize', function ($provide) {
        $provide.service('savedVisualizations', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedVisualizations', fakeSavedVisualisations);
        });
      });

      ngMock.inject(function (Private) {
        deleteHelper = Private(require('ui/kibi/helpers/delete_helper'));
      });
    });

    require('testUtils/noDigestPromises').activateForSuite();

    describe('getVisualisations', function () {
      it('should return the visualisation that use query 456', function (done) {
        deleteHelper._getVisualisations([ '456', '789' ]).then(function (visData) {
          expect(visData[0]).to.eql([ '456' ]);
          expect(visData[1]).to.have.length(1);
          expect(visData[1][0].title).to.be('myvis2');
          done();
        }).catch(done);
      });

      it('should return the visualisations that use queries 123 and 456', function (done) {
        deleteHelper._getVisualisations([ '456', '123' ]).then(function (visData) {
          expect(visData[0]).to.have.length(2);
          expect(visData[0]).to.contain('123');
          expect(visData[0]).to.contain('456');
          expect(visData[1]).to.have.length(2);
          expect(visData[1][0].title).to.be('myvis1');
          expect(visData[1][1].title).to.be('myvis2');
          done();
        }).catch(done);
      });

      it('should return no visualisation', function (done) {
        deleteHelper._getVisualisations([ '666' ]).then(function (visData) {
          expect(visData[0]).to.have.length(0);
          expect(visData[1]).to.have.length(0);
          done();
        }).catch(done);
      });
    });

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
