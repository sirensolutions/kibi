import noDigestPromises from 'test_utils/no_digest_promises';
import { DeleteHelperFactory } from 'ui/kibi/helpers/delete_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { intersection } from 'lodash';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import sinon from 'sinon';

const fakeSavedVisualisations = [
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
const fakeSavedDashboardGroups = [
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
let deleteHelper;
let computeGroupsStub;
let $window;
let alertStub;

describe('Kibi Components', function () {
  describe('deleteHelper', function () {
    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
      });

      ngMock.module('investigate_core/saved_objects/dashboard_groups', function ($provide) {
        $provide.service('savedDashboardGroups', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedDashboardGroups', fakeSavedDashboardGroups);
        });
      });

      ngMock.module('app/visualize', function ($provide) {
        $provide.service('savedVisualizations', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedVisualizations', fakeSavedVisualisations);
        });
      });

      ngMock.inject(function (_$window_, dashboardGroups, Private, Promise) {
        $window = _$window_;
        deleteHelper = Private(DeleteHelperFactory);

        computeGroupsStub = sinon.stub(dashboardGroups, 'computeGroups').returns(Promise.resolve('computed groups'));

        const _matchInArray = sinon.match(value => intersection([ 'Companies', 'Articles' ], value).length, 'match in array');
        const getGroupIdsStub = sinon.stub(dashboardGroups, 'getIdsOfDashboardGroupsTheseDashboardsBelongTo');
        getGroupIdsStub.withArgs(_matchInArray).returns([ 'group-1' ]);
        getGroupIdsStub.withArgs(sinon.match.any).returns([]);
      });

      alertStub = sinon.stub($window, 'alert', () => false);
    });

    afterEach(function () {
      alertStub.restore();
    });

    noDigestPromises.activateForSuite();

    describe('getVisualisations', function () {
      it('should return the visualisation that use query 456', function () {
        return deleteHelper._getVisualisations([ '456', '789' ]).then(function (visData) {
          expect(visData[0]).to.eql([ '456' ]);
          expect(visData[1]).to.have.length(1);
          expect(visData[1][0].title).to.be('myvis2');
        });
      });

      it('should return the visualisations that use queries 123 and 456', function () {
        return deleteHelper._getVisualisations([ '456', '123' ]).then(function (visData) {
          expect(visData[0]).to.have.length(2);
          expect(visData[0]).to.contain('123');
          expect(visData[0]).to.contain('456');
          expect(visData[1]).to.have.length(2);
          expect(visData[1][0].title).to.be('myvis1');
          expect(visData[1][1].title).to.be('myvis2');
        });
      });

      it('should return no visualisation', function () {
        return deleteHelper._getVisualisations([ '666' ]).then(function (visData) {
          expect(visData[0]).to.have.length(0);
          expect(visData[1]).to.have.length(0);
        });
      });
    });

    it('should call the delegated delete method method if the service is neither a query nor a dashboard', function () {
      const deleteSpy = sinon.spy();

      deleteHelper.deleteByType('aaa', null, deleteSpy);
      sinon.assert.called(deleteSpy);
    });

    it('should call the delegated delete method method if the query is not used by any visualisations', function () {
      const deleteSpy = sinon.spy();

      return deleteHelper.deleteByType('query', [{ id: '666' }], deleteSpy).then(function () {
        sinon.assert.called(deleteSpy);
      });
    });

    it('should not delete query that is used by a visualisation', function () {
      const deleteSpy = sinon.spy();
      return deleteHelper.deleteByType('query', [{ id: '123' }], deleteSpy).then(function () {
        sinon.assert.called(alertStub);
        sinon.assert.notCalled(deleteSpy);
      });
    });

    it('should recompute dashboard groups if a group was deleted', function () {
      const deleteSpy = sinon.spy();

      return deleteHelper.deleteByType('dashboardgroup', [{ id: 'group-1' }], deleteSpy)
      .then(function () {
        sinon.assert.called(deleteSpy);
        sinon.assert.called(computeGroupsStub);
      });
    });

    it('should call the delegated delete method method if the dashboard is not in any group', function () {
      const deleteSpy = sinon.spy();

      return deleteHelper.deleteByType('dashboard', [{ id: 'dashboard 666' }], deleteSpy)
      .then(function () {
        sinon.assert.called(deleteSpy);
        sinon.assert.called(computeGroupsStub); // should recompute the dashboard groups
      });
    });

    it('should not delete dashboard that is in a group', function () {
      const deleteSpy = sinon.spy();

      return deleteHelper.deleteByType('dashboard', [{ id: 'Companies' }], deleteSpy)
      .then(function () {
        sinon.assert.called(alertStub);
        sinon.assert.notCalled(deleteSpy);
      });
    });
  });
});
