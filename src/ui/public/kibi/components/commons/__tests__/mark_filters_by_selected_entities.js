import { MarkFiltersBySelectedEntitiesFactory } from 'ui/kibi/components/commons/_mark_filters_by_selected_entities';
import noDigestPromises from 'test_utils/no_digest_promises';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import * as onPage from 'ui/kibi/utils/on_page';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';

let markFiltersBySelectedEntities;
let kibiState;
let onDashboardPageStub;

const fakeSavedQueries = [
  {
    id: 'query1',
    title: '',
    resultQuery: 'SELECT * FROM mytable WHERE id = \'@doc[_source][id]@\''
  },
  {
    id: 'query2',
    title: '',
    resultQuery: 'SELECT * FROM mytable WHERE id = \'123\''
  }
];

describe('Kibi Components', function () {
  describe('Commons', function () {
    describe('_mark_filters_by_selected_entities', function () {

      noDigestPromises.activateForSuite();

      beforeEach(function () {
        ngMock.module('kibana', function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
        });

        afterEach(function () {
          onDashboardPageStub.restore();
        });

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', fakeSavedQueries));
        });

        ngMock.inject(function (Private, _kibiState_) {
          kibiState = _kibiState_;

          onDashboardPageStub = sinon.stub(onPage, 'onDashboardPage').returns(true);

          markFiltersBySelectedEntities = Private(MarkFiltersBySelectedEntitiesFactory);
        });
      });

      it('should mark dbfilter with query which depends on selected entity and selected entity NOT disabled', function () {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.disableSelectedEntity(false);

        return markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
        });
      });

      it('should mark disabled dbfilter with query which depends on selected document and selected document is disabled', function () {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.disableSelectedEntity(true);

        return markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(true);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
        });
      });

      it('should not set dependsOnSelectedEntitiesDisabled to true if filter does not depend on entities', function () {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          },
          {
            join_sequence: {},
            meta: {}
          }
        ];

        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.disableSelectedEntity(true);

        return markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(true);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
          expect(filters[1].meta.dependsOnSelectedEntities).to.equal(false);
          expect(filters[1].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[1].meta.markDependOnSelectedEntities).to.equal(true);
        });
      });

      it('should NOT mark dbfilter with query which does NOT depends on selected document', function () {
        const filters = [
          {
            dbfilter: {
              queryid: 'query2'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.disableSelectedEntity(false);

        return markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(false);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
        });
      });

      it('query does not exists', function () {
        const filters = [
          {
            dbfilter: {
              queryid: 'does-not-exists'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.disableSelectedEntity(false);

        return markFiltersBySelectedEntities(filters).catch(function (err) {
          expect(err.message).to.equal('Unable to find queries: ["does-not-exists"]');
        });
      });

    });
  });
});
