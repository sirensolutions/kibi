import sinon from 'auto-release-sinon';
import KibiSelectHelperProvider from 'ui/kibi/directives/kibi_select_helper';
import IndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import noDigestPromises from 'test_utils/no_digest_promises';
import Promise from 'bluebird';

describe('Kibi Directives', function () {
  describe('KibiSelect Helper', function () {
    let kibiSelectHelper;
    let config;
    let indexPatterns;
    let stubMapping;
    let stubSearch;
    let mappings;

    noDigestPromises.activateForSuite();

    const init = function ({
        savedDatasources = [],
        savedSearches = [],
        savedQueries = [],
        savedTemplates = [],
        savedDashboards = [],
        stubIndexPatterns = false,
        stubConfig = false
      } = {}) {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnIndex', '.kibi');
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        if (savedDatasources) {
          $provide.service('savedDatasources', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedDatasources', savedDatasources);
          });
        }
        if (savedSearches) {
          $provide.service('savedSearches', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedSearches', savedSearches);
          });
        }
      });

      if (savedQueries) {
        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', savedQueries));
        });
      }

      if (savedTemplates) {
        ngMock.module('templates_editor/services/saved_templates', function ($provide) {
          $provide.service('savedTemplates', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedTemplates', savedTemplates);
          });
        });
      }

      if (savedDashboards) {
        ngMock.module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards);
          });
        });
      }

      if (stubIndexPatterns) {
        ngMock.module('kibana/index_patterns', function ($provide) {
          $provide.service('indexPatterns', function (Promise, Private) {
            const indexPattern = Private(IndexPatternProvider);
            return {
              get: function (id) {
                return Promise.resolve(indexPattern);
              },
              getIds: function () {
                return Promise.resolve([ 'aaa', 'bbb' ]);
              }
            };
          });
        });
      }

      ngMock.inject(function ($injector, Private) {
        kibiSelectHelper = Private(KibiSelectHelperProvider);
        if (stubConfig) {
          config = $injector.get('config');
        }
        const es = $injector.get('es');
        stubMapping = sinon.stub(es.indices, 'getMapping');
        stubSearch = sinon.stub(es, 'search');
        mappings = $injector.get('mappings');
      });
    };

    describe('GetQueries', function () {
      const fakeSavedDatasources = [
        {
          id: 'ds1',
          title: 'ds1 datasource',
          datasourceType: 'sparql_http'
        },
        {
          id: 'ds2',
          title: 'ds2 datasource',
          datasourceType: 'mysql'
        },
        {
          id: 'ds3',
          title: 'ds3 datasource',
          datasourceType: 'rest'
        }
      ];

      const fakeSavedQueries = [
        {
          id: 'sparql',
          title: 'sparql query',
          resultQuery: 'select ?name { ?s ?p ?o }',
          datasourceId: 'ds1',
          tags: []
        },
        {
          id: 'sql',
          title: 'sql query',
          resultQuery: 'select name from person',
          datasourceId: 'ds2',
          tags: []
        },
        {
          id: 'rest',
          title: 'rest query',
          resultQuery: '',
          datasourceId: 'ds3',
          tags: []
        },
        {
          id: 'rest_with_query_variables',
          title: 'rest_with_query_variables query',
          resultQuery: '',
          datasourceId: 'ds3',
          rest_variables: '[' +
            '{"name": "ids", "value": "$[*].id"},' +
            '{"name": "names", "value": "$[*].name"}' +
          ']',
          tags: []
        },
        {
          id: 'nodatasource',
          title: 'nodatasource query',
          resultQuery: '',
          datasourceId: '',
          tags: []
        },
        {
          id: 'q2',
          title: 'q2 query',
          tags: [ 'tag2', '42' ]
        }
      ];

      beforeEach(function () {
        init({
          savedQueries: fakeSavedQueries,
          savedDatasources: fakeSavedDatasources
        });
      });

      it('should set the group and datasourceType', function () {
        return kibiSelectHelper.getQueries().then(function (queries) {
          expect(queries).to.have.length(6);
          expect(queries[0].group).to.be('No tag');
          expect(queries[1].group).to.be('No tag');
          expect(queries[2].group).to.be('No tag');
          expect(queries[3].group).to.be('No tag');
          expect(queries[4].group).to.be('No tag');
          expect(queries[5].group).to.be('tag2,42');
          expect(queries[0].datasourceType).to.be('sparql_http');
          expect(queries[1].datasourceType).to.be('mysql');
          expect(queries[2].datasourceType).to.be('rest');
          expect(queries[3].datasourceType).to.be('rest');
          expect(queries[4].datasourceType).to.be(null);
          expect(queries[5].datasourceType).to.be(null);
        });
      });
    });

    describe('GetDocumentIds', function () {

      function fakeHits() {
        const hits = { hits: { hits: [] } };
        for (let i = 0; i < arguments.length; i++) {
          hits.hits.hits.push(arguments[i]);
        }
        return hits;
      }

      beforeEach(function () {
        init();
      });

      it('should return the ids of the given index', function () {
        const ids = fakeHits(
          {
            _id: 'id1',
          },
          {
            _id: 'id2',
          }
        );

        stubSearch.returns(Promise.resolve(ids));
        return kibiSelectHelper.getDocumentIds('a', 'A').then(function (data) {
          expect(data).to.have.length(2);
          expect(data[0]).to.eql({ label: 'id1', value: 'id1' });
          expect(data[1]).to.eql({ label: 'id2', value: 'id2' });
        });
      });

      it('should return empty set when the index is not passed', function () {
        return kibiSelectHelper.getDocumentIds('', 'A').then(function (data) {
          expect(data).to.have.length(0);
        });
      });

      it('should return empty set when the type is not passed', function () {
        return kibiSelectHelper.getDocumentIds('a', '').then(function (data) {
          expect(data).to.have.length(0);
        });
      });
    });

    describe('GetTemplates', function () {
      const fakeSavedTemplates = [
        {
          id: 'template-1',
          title: 'template 1',
          description: '',
          templateSource: '',
          templateEngine: 'jade',
          version: 1
        }
      ];

      beforeEach(function () {
        init({
          savedTemplates: fakeSavedTemplates
        });
      });

      it('select saved templates', function () {
        return kibiSelectHelper.getTemplates().then(function (templates) {
          const expectedTemplates = [
            {
              value: 'template-1',
              label: 'template 1'
            }
          ];
          expect(templates).to.be.eql(expectedTemplates);
        });
      });
    });

    describe('GetSavedSearches', function () {

      const fakeSavedSearches = [
        {
          id: 'search-ste',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'search-ste',
                filter: [],
                query: {}
              }
            )
          }
        },
        {
          id: 'time-testing-4',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'time-testing-4', // here put this id to make sure fakeTimeFilter will supply the timfilter for it
                filter: [],
                query: {}
              }
            )
          }
        }
      ];

      beforeEach(function () {
        init({
          savedSearches: fakeSavedSearches
        });
      });

      it('select saved searches', function () {
        return kibiSelectHelper.getSavedSearches().then(function (savedSearches) {
          const expectedSavedSearches = [
            {
              value: 'search-ste',
              label: undefined
            },
            {
              value: 'time-testing-4',
              label: undefined
            }
          ];
          expect(savedSearches).to.be.eql(expectedSavedSearches);
        });
      });
    });

    describe('GetDashboards', function () {

      const fakeSavedDashboards = [
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

      beforeEach(function () {
        init({
          savedDashboards: fakeSavedDashboards
        });
      });

      it('select dashboards', function () {
        return kibiSelectHelper.getDashboards().then(function (dashboards) {
          const expectedDashboards = [
            {
              value: 'Articles',
              label: 'Articles'
            },
            {
              value: 'Companies',
              label: 'Companies'
            },
            {
              value: 'time-testing-1',
              label: 'time testing 1'
            },
            {
              value: 'time-testing-2',
              label: 'time testing 2'
            },
            {
              value: 'time-testing-3',
              label: 'time testing 3'
            }
          ];
          expect(dashboards).to.be.eql(expectedDashboards);
        });
      });
    });

    describe('GetDatasources', function () {

      const fakeSavedDatasources = [
        {
          id: 'ds1',
          title: 'ds1 datasource',
          datasourceType: 'sparql_http'
        },
        {
          id: 'ds2',
          title: 'ds2 datasource',
          datasourceType: 'mysql'
        }
      ];

      beforeEach(function () {
        init({
          savedDatasources: fakeSavedDatasources
        });
      });

      it('select datasources', function () {
        return kibiSelectHelper.getDatasources().then(function (datasources) {
          expect(datasources).to.have.length(2);
          expect(datasources[0].value).to.be('ds1');
          expect(datasources[0].label).to.be('ds1 datasource');
          expect(datasources[1].value).to.be('ds2');
          expect(datasources[1].label).to.be('ds2 datasource');
        });
      });
    });

    describe('GetIndexTypes', function () {

      beforeEach(function () {
        init();
      });

      it('no index pattern id specified', function () {
        kibiSelectHelper.getIndexTypes().then(function (types) {
          expect(types).to.eql([]);
        });
      });

      it('should get the type of the dog index', function () {
        const response = {
          dog: {
            mappings: { animal: {} }
          }
        };
        const getMappingStub = sinon.stub(mappings, 'getMapping').returns(Promise.resolve(response));

        return kibiSelectHelper.getIndexTypes('dog').then(function (types) {
          sinon.assert.calledOnce(getMappingStub);
          expect(types).to.have.length(1);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');
        });
      });

      it('should get the type of all returned indices', function () {
        const response = {
          dog: {
            mappings: { animal: {} }
          },
          dogboy: {
            mappings: { hero: {} }
          }
        };
        const getMappingStub = sinon.stub(mappings, 'getMapping').returns(Promise.resolve(response));

        return kibiSelectHelper.getIndexTypes('dog*').then(function (types) {
          sinon.assert.calledOnce(getMappingStub);
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');
          expect(types[1].label).to.be('hero');
          expect(types[1].value).to.be('hero');
        });
      });
    });

    describe('GetFields', function () {

      beforeEach(function () {
        init({
          stubIndexPatterns: true,
          stubConfig: true
        });
      });

      it('should return the fields', function () {
        config.set('metaFields', [ '_id' ]); // make sure _id is a meta field
        return kibiSelectHelper.getFields().then(function (fields) {
          expect(_.find(fields, { label: 'ssl' })).not.to.be.ok();
          expect(_.find(fields, { label: '_id' })).not.to.be.ok();
          expect(_.find(fields, { label: 'area' })).to.be.ok();
          expect(_.find(fields, { label: 'area' }).options.analyzed).to.be.ok();
          expect(_.find(fields, { label: 'custom_user_field' })).to.be.ok();
          expect(_.find(fields, { label: 'custom_user_field' }).options.analyzed).not.to.be.ok();
        });
      });

      it('should return only date fields ', function () {
        return kibiSelectHelper.getFields(null, ['date']).then(function (fields) {
          expect(fields).to.have.length(3);
          expect(_.find(fields, { label: '@timestamp' })).to.be.ok();
          expect(_.find(fields, { label: 'time' })).to.be.ok();
          expect(_.find(fields, { label: 'utc_time' })).to.be.ok();
        });
      });

      it('should return data without scripted fields if scriptedFields equals false ', function () {
        return kibiSelectHelper.getFields(null, null, false).then(function (fields) {
          for (let i = 0; i < fields.length; i++) {
            expect(fields[i].options.scripted).not.to.be(true);
          }
        });
      });

      it('should return data with scripted fields if scriptedFields equals true ', function () {
        return kibiSelectHelper.getFields(null, null, true).then(function (fields) {
          for (let i = 0; i < fields.length; i++) {
            expect(fields[i].options.scripted).not.to.be(undefined);
          }
        });
      });
    });

    describe('GetIndexesId', function () {

      beforeEach(function () {
        init({
          stubIndexPatterns: true
        });
      });

      it('should return the ID of indices', function () {
        return kibiSelectHelper.getIndexesId().then(function (ids) {
          expect(ids).to.have.length(2);
          expect(ids[0].label).to.be('aaa');
          expect(ids[0].value).to.be('aaa');
          expect(ids[1].label).to.be('bbb');
          expect(ids[1].value).to.be('bbb');
        });
      });
    });

    describe('GetQueryVariables', function () {

      const fakeSavedDatasources = [
        {
          id: 'ds1',
          title: 'ds1 datasource',
          datasourceType: 'sparql_http'
        },
        {
          id: 'ds2',
          title: 'ds2 datasource',
          datasourceType: 'mysql'
        },
        {
          id: 'ds3',
          title: 'ds3 datasource',
          datasourceType: 'rest'
        }
      ];

      const fakeSavedQueries = [
        {
          id: 'sparql',
          title: 'sparql query',
          resultQuery: 'select ?name { ?s ?p ?o }',
          datasourceId: 'ds1',
          tags: []
        },
        {
          id: 'sql',
          title: 'sql query',
          resultQuery: 'select name from person',
          datasourceId: 'ds2',
          tags: []
        },
        {
          id: 'rest',
          title: 'rest query',
          resultQuery: '',
          datasourceId: 'ds3',
          tags: []
        },
        {
          id: 'rest_with_query_variables',
          title: 'rest_with_query_variables query',
          resultQuery: '',
          datasourceId: 'ds3',
          rest_variables: '[' +
            '{"name": "ids", "value": "$[*].id"},' +
            '{"name": "names", "value": "$[*].name"}' +
          ']',
          tags: []
        },
        {
          id: 'nodatasource',
          title: 'nodatasource query',
          resultQuery: '',
          datasourceId: '',
          tags: []
        },
        {
          id: 'q2',
          title: 'q2 query',
          tags: [ 'tag2', '42' ]
        }
      ];

      beforeEach(function () {
        init({
          savedDatasources: fakeSavedDatasources,
          savedQueries: fakeSavedQueries
        });
      });


      it('should return undefined if no query ID is passed', function () {
        return kibiSelectHelper.getQueryVariables()
        .then(function (variables) {
          return Promise.reject(new Error('should fail! ' + variables));
        })
        .catch(function (err) {
          expect(err.message).to.equal('Unable to get variables of unknown query');
        });
      });

      it('should return empty variables of the REST query', function () {
        return kibiSelectHelper.getQueryVariables('rest').then(function (variables) {
          expect(variables.fields).to.have.length(0);
          expect(variables.datasourceType).to.equal('rest');
        });
      });

      it('should return the variables of the REST query', function () {
        return kibiSelectHelper.getQueryVariables('rest_with_query_variables').then(function (variables) {
          expect(variables.fields).to.have.length(2);
          expect(variables.datasourceType).to.equal('rest');
          expect(variables.fields).to.eql([
            {
              label: 'ids',
              value: 'ids'
            },
            {
              label: 'names',
              value: 'names'
            }
          ]);
        });
      });

      it('should return the variables of the SQL query', function () {
        return kibiSelectHelper.getQueryVariables('sql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('mysql');
        });
      });

      it('should return the variables of the SPARQL query', function () {
        return kibiSelectHelper.getQueryVariables('sparql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('?name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('sparql_http');
        });
      });

      it('should return an error if query is unknown', function () {
        kibiSelectHelper.getQueryVariables('boo')
        .then(function (variables) {
          return Promise.reject(new Error('should fail! ' + variables));
        })
        .catch(function (err) {
          expect(err.message).to.be('Query with id [boo] was not found');
        });
      });

      it('should return an error if query has no or unsupported datasource type', function () {
        kibiSelectHelper.getQueryVariables('nodatasource')
        .then(function (variables) {
          return Promise.reject(new Error('should fail! ' + variables));
        })
        .catch(function (err) {
          expect(err.message).to.be('SavedQuery [nodatasource] does not have datasourceId parameter');
        });
      });
    });

    describe('GetIconType', function () {
      it('should return available icon types', function () {
        return kibiSelectHelper.getIconType().then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('Font Awesome');
          expect(types[0].value).to.be('fontawesome');
          expect(types[1].label).to.be('Parameterized Relative Path');
          expect(types[1].value).to.be('relpath');
        });
      });
    });

    describe('getLabelType', function () {
      it('should return available icon types', function () {
        return kibiSelectHelper.getLabelType().then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('Document Field');
          expect(types[0].value).to.be('docField');
          expect(types[1].label).to.be('Parameterized Field');
          expect(types[1].value).to.be('paramField');
        });
      });
    });

    describe('getDashboardsForButton', function () {
      const fakeSavedDashboards = [
        {
          id: 'Articles',
          title: 'Articles',
          savedSearchId: 'savedArticles'
        },
        {
          id: 'Companies-Timeline',
          title: 'Companies Timeline',
          savedSearchId: 'savedCompanies'
        },
        {
          id: 'Companies',
          title: 'Companies',
          savedSearchId: 'savedCompanies'
        },
        {
          id: 'Investments',
          title: 'Investments',
          savedSearchId: 'savedInvestments'
        },
        {
          id: 'NoSavedSearch',
          title: 'NoSavedSearch'
        }
      ];
      const fakeSavedSearches = [
        {
          id: 'savedArticles',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'art*',
                filter: [],
                query: {}
              }
            )
          }
        },
        {
          id: 'savedCompanies',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'comp*',
                filter: [],
                query: {}
              }
            )
          }
        },
        {
          id: 'savedInvestments',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'invest*',
                filter: [],
                query: {}
              }
            )
          }
        }
      ];
      const relations = {
        relationsIndices: [
          {
            indices: [
              {
                indexPatternId: 'art*',
                path: 'path-a'
              },
              {
                indexPatternId: 'comp*',
                path: 'path-c'
              }
            ],
            label: 'label-a-c',
            id: 'art*//path-a/comp*//path-c'
          },
          {
            indices: [
              {
                indexPatternId: 'comp*',
                path: 'path-c'
              },
              {
                indexPatternId: 'invest*',
                path: 'path-i'
              }
            ],
            label: 'label-c-i',
            id: 'comp*//path-c/invest*//path-i'
          },
          {
            indices: [
              {
                indexPatternId: 'comp*',
                path: 'path-c1'
              },
              {
                indexPatternId: 'comp*',
                path: 'path-c2'
              }
            ],
            label: 'label-c-c',
            id: 'comp*//path-c1/comp*//path-c2'
          }
        ]
      };

      beforeEach(function () {
        init({
          savedDashboards: fakeSavedDashboards,
          savedSearches: fakeSavedSearches,
          stubConfig: true
        });
        config.set('kibi:relations', relations);
      });

      it('should not propose any dashboard if the relation does not exist', function () {
        const options = {
          indexRelationId: 'art*//path-a/comp*//path-c'
        };

        config.set('kibi:relations', {
          relationsIndices: []
        });
        return kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(dashboards).to.have.length(0);
        });
      });

      it('should not propose any dashboard if the relation does not exist even if the paired dashboard is set', function () {
        const options = {
          indexRelationId: 'art*//path-a/comp*//path-c',
          otherDashboardId: 'Companies'
        };

        config.set('kibi:relations', {
          relationsIndices: []
        });
        return kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(dashboards).to.have.length(0);
        });
      });

      it('no options should return all dashboards with savedSearchId set', function () {
        const expectedDashboards = [
          {
            label: 'Articles',
            value: 'Articles'
          },
          {
            label: 'Companies',
            value: 'Companies'
          },
          {
            label: 'Companies Timeline',
            value: 'Companies-Timeline'
          },
          {
            label: 'Investments',
            value: 'Investments'
          }
        ];
        return kibiSelectHelper.getDashboardsForButton({})
        .then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
        });
      });

      it('pass only the otherDashboardId and NO indexRelationId should return all dashboards with savedSearchId set', function () {
        const expectedDashboards = [
          {
            label: 'Articles',
            value: 'Articles'
          },
          {
            label: 'Companies',
            value: 'Companies'
          },
          {
            label: 'Companies Timeline',
            value: 'Companies-Timeline'
          },
          {
            label: 'Investments',
            value: 'Investments'
          }
        ];
        const options = {
          otherDashboardId: 'Companies'
        };
        return kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
        });
      });

      it('pass indexRelationId and otherDashboardId in the option should filter the dashboards', function () {
        const expectedDashboards = [
          {
            label: 'Articles',
            value: 'Articles'
          }
        ];
        const options = {
          otherDashboardId: 'Companies',
          indexRelationId: 'art*//path-a/comp*//path-c'
        };
        return kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
        });
      });

      it('pass self join indexRelationId and otherDashboardId in the option should filter the dashboards', function () {
        const expectedDashboards = [
          {
            label: 'Companies',
            value: 'Companies'
          },
          {
            label: 'Companies Timeline',
            value: 'Companies-Timeline'
          }
        ];
        const options = {
          otherDashboardId: 'Companies',
          indexRelationId: 'comp*//path-c1/comp*//path-c2'
        };
        return kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
        });
      });
    });

  });
});
