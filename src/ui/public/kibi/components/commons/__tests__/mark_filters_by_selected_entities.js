import sinon from 'auto-release-sinon';
import ngMock from 'ngMock';
import expect from 'expect.js';
import onPage from 'ui/kibi/utils/on_page';

let markFiltersBySelectedEntities;
let kibiState;

const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
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

      require('testUtils/noDigestPromises').activateForSuite();

      beforeEach(function () {
        ngMock.module('kibana', function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
          $provide.constant('kibiDefaultDashboardTitle', '');
          $provide.constant('elasticsearchPlugins', ['siren-join']);
        });

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', fakeSavedQueries));
        });

        ngMock.inject(function (Private, _kibiState_) {
          kibiState = _kibiState_;

          sinon.stub(onPage, 'onDashboardPage').returns(true);

          markFiltersBySelectedEntities = Private(require('ui/kibi/components/commons/_mark_filters_by_selected_entities'));
        });
      });

      it('should mark dbfilter with query which depends on selected entity and selected entity NOT disabled', function (done) {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI('uri1');
        kibiState.disableSelectedEntity(false);

        markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
          done();
        });
      });

      it('should mark disabled dbfilter with query which depends on selected document and selected document is disabled', function (done) {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI('uri1');
        kibiState.disableSelectedEntity(true);

        markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(true);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
          done();
        });
      });

      it('should not set dependsOnSelectedEntitiesDisabled to true if filter does not depend on entities', function (done) {
        const filters = [
          {
            dbfilter: {
              queryid: 'query1'
            },
            meta: {}
          },
          {
            join_set: {},
            meta: {}
          }
        ];

        kibiState.setEntityURI('uri1');
        kibiState.disableSelectedEntity(true);

        markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(true);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(true);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
          expect(filters[1].meta.dependsOnSelectedEntities).to.equal(false);
          expect(filters[1].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[1].meta.markDependOnSelectedEntities).to.equal(true);
          done();
        });
      });

      it('should NOT mark dbfilter with query which does NOT depends on selected document', function (done) {
        const filters = [
          {
            dbfilter: {
              queryid: 'query2'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI('uri1');
        kibiState.disableSelectedEntity(false);

        markFiltersBySelectedEntities(filters).then(function (filters) {
          expect(filters[0].meta.dependsOnSelectedEntities).to.equal(false);
          expect(filters[0].meta.dependsOnSelectedEntitiesDisabled).to.equal(false);
          expect(filters[0].meta.markDependOnSelectedEntities).to.equal(true);
          done();
        });
      });

      it('query does not exists', function (done) {
        const filters = [
          {
            dbfilter: {
              queryid: 'does-not-exists'
            },
            meta: {}
          }
        ];

        kibiState.setEntityURI('uri1');
        kibiState.disableSelectedEntity(false);

        markFiltersBySelectedEntities(filters).catch(function (err) {
          expect(err.message).to.equal('Unable to find queries: ["does-not-exists"]');
          done();
        });
      });

    });
  });
});

