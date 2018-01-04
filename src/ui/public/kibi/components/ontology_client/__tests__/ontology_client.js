import ngMock from 'ng_mock';
import sinon from 'sinon';

let $httpBackend;
let ontologyClient;

describe('Kibi Components', function () {
  describe('Ontology client', function () {

    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', function () {
          return {
            find: function () {
              return Promise.resolve({ hits: [] });
            }
          };
        });
      });

      ngMock.inject(function ($injector) {
        $httpBackend = $injector.get('$httpBackend');
        ontologyClient = $injector.get('ontologyClient');
      });
    });

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('gets the relations from the ontology model', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getRelations();
      $httpBackend.flush();
    });

    it('gets ranges for the given entity', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getRangesForEntityId('id');
      $httpBackend.flush();
    });

    it('gets the relations for the given domain', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getRelationsByDomain('id');
      $httpBackend.flush();
    });

    it('gets the unique relation labels', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getUniqueRelationLabels();
      $httpBackend.flush();
    });

    it('gets the unique field descriptions', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getUniqueFieldDescriptions();
      $httpBackend.flush();
    });

    it('gets all the entities', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getEntities();
      $httpBackend.flush();
    });

    it('gets an entity by id', function () {
      $httpBackend.expectPOST(/\/schema/).respond({ data: { id: 'something' } });
      ontologyClient.getEntityById('id');
      $httpBackend.flush();
    });

    it('gets the dashboard given an entity id', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.getDashboardsByEntity({});
      $httpBackend.flush();
    });

    it('inserts an array of relations', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.insertRelations([{}]);
      $httpBackend.flush();
    });

    it('inserts an entity', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.insertEntity({ id: 'id' });
      $httpBackend.flush();
    });

    it('executes a SPARQL update query', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.updateWithQuery({});
      $httpBackend.flush();
    });

    it('updates an existing entity', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.updateEntity({});
      $httpBackend.flush();
    });

    it('deletes an entity', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.deleteEntity('id');
      $httpBackend.flush();
    });

    it('deletes all relations that have the given entity as domain or range', function () {
      $httpBackend.expectPOST(/\/schema/).respond();
      ontologyClient.deleteByDomainOrRange('id');
      $httpBackend.flush();
    });

    it('should encode relations id if needed', function () {
      const _executeSchemaUpdateAndClearCacheStub = sinon.stub(ontologyClient, '_executeSchemaUpdateAndClearCache')
      .returns(Promise.resolve());

      const expectedArg = {
        path: '/schema/relations',
        method: 'POST',
        data: [{ id: 'company%2F%2Fid%2Finvetment%2F%2Fcompanies' }]
      };

      ontologyClient.insertRelations([{ id: 'company%2F%2Fid%2Finvetment%2F%2Fcompanies' }]);
      sinon.assert.calledWith(_executeSchemaUpdateAndClearCacheStub, expectedArg);
      ontologyClient.insertRelations([{ id: 'company//id/invetment//companies' }]);
      sinon.assert.calledWith(_executeSchemaUpdateAndClearCacheStub, expectedArg);
    });
  });
});
