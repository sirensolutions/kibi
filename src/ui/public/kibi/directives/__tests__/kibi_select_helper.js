const _ = require('lodash');
const ngMock = require('ngMock');
const expect = require('expect.js');
const sinon = require('auto-release-sinon');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');

let kibiSelectHelper;
let config;
let indexPatterns;
let mappings;

describe('Kibi Directives', function () {
  describe('KibiSelect Helper', function () {

    let stubSearch;

    require('testUtils/noDigestPromises').activateForSuite();

    var init = function (opt) {
      var defaultOptions =  {
        savedDatasources: [],
        savedSearches: [],
        savedQueries: [],
        savedTemplates: [],
        savedDashboards: [],
        stubIndexPatternsGetIds: false,
        initIndexPattern: false,
        stubConfig: false,
        initHttpBackend: false
      };

      var options = {};
      _.merge(options, defaultOptions, opt);


      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnIndex', '.kibi');
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
        if (options.savedDatasources) {
          $provide.service('savedDatasources', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedDatasources', options.savedDatasources);
          });
        }
        if (options.savedSearches) {
          $provide.service('savedSearches', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedSearches', options.savedSearches);
          });
        }
      });

      if (options.stubIndexPatternsGetIds) {
        ngMock.module('kibana/courier', function ($provide) {
          $provide.service('courier', function (Promise) {
            return {
              indexPatterns: {
                getIds: function () {
                  return Promise.resolve([ 'aaa', 'bbb' ]);
                }
              }
            };
          });
        });
      }

      if (options.savedQueries) {
        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', options.savedQueries));
        });
      }

      if (options.savedTemplates) {
        ngMock.module('templates_editor/services/saved_templates', function ($provide) {
          $provide.service('savedTemplates', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedTemplates', options.savedTemplates);
          });
        });
      }

      if (options.savedDashboards) {
        ngMock.module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', (Promise, Private) => {
            return mockSavedObjects(Promise, Private)('savedDashboards', options.savedDashboards);
          });
        });
      }

      if (options.initIndexPattern) {
        ngMock.module('kibana/index_patterns', function ($provide) {
          $provide.service('indexPatterns', function (Promise, Private) {
            var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
            return {
              get: function (id) {
                return Promise.resolve(indexPattern);
              }
            };
          });
        });
      }

      ngMock.inject(function (es, $injector, Private) {
        kibiSelectHelper = Private(require('ui/kibi/directives/kibi_select_helper'));
        if (options.stubConfig) {
          config = $injector.get('config');
        }
        stubSearch = sinon.stub(es, 'search');
        mappings = $injector.get('mappings');
      });
    };

    describe('GetQueries', function () {
      var fakeSavedDatasources = [
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

      var fakeSavedQueries = [
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

      it('should set the group and datasourceType', function (done) {
        kibiSelectHelper.getQueries().then(function (queries) {
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
          done();
        }).catch(done);
      });
    });

    describe('GetDocumentIds', function () {

      function fakeHits() {
        var hits = { hits: { hits: [] } };
        for (var i = 0; i < arguments.length; i++) {
          hits.hits.hits.push(arguments[i]);
        }
        return hits;
      }

      beforeEach(function () {
        init({
          initHttpBackend: true
        });
      });


      it('should return the ids of the given index', function (done) {
        var ids = fakeHits(
          {
            _id: 'id1',
          },
          {
            _id: 'id2',
          }
        );

        stubSearch.returns(Promise.resolve(ids));
        kibiSelectHelper.getDocumentIds('a', 'A').then(function (data) {
          expect(data).to.have.length(2);
          expect(data[0]).to.eql({ label: 'id1', value: 'id1' });
          expect(data[1]).to.eql({ label: 'id2', value: 'id2' });
          done();
        }).catch(done);
      });

      it('should return empty set when the index is not passed', function (done) {
        kibiSelectHelper.getDocumentIds('', 'A').then(function (data) {
          expect(data).to.have.length(0);
          done();
        }).catch(done);
      });

      it('should return empty set when the type is not passed', function (done) {
        kibiSelectHelper.getDocumentIds('a', '').then(function (data) {
          expect(data).to.have.length(0);
          done();
        }).catch(done);
      });
    });

    describe('GetTemplates', function () {
      var fakeSavedTemplates = [
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

      it('select saved templates', function (done) {
        kibiSelectHelper.getTemplates().then(function (templates) {
          var expectedTemplates = [
            {
              value: 'template-1',
              label: 'template 1'
            }
          ];
          expect(templates).to.be.eql(expectedTemplates);
          done();
        }).catch(done);
      });
    });

    describe('GetSavedSearches', function () {

      var fakeSavedSearches = [
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

      it('select saved searches', function (done) {
        kibiSelectHelper.getSavedSearches().then(function (savedSearches) {
          var expectedSavedSearches = [
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
          done();
        }).catch(done);
      });
    });

    describe('GetDashboards', function () {

      var fakeSavedDashboards = [
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

      it('select dashboards', function (done) {
        kibiSelectHelper.getDashboards().then(function (dashboards) {
          var expectedDashboards = [
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
          done();
        }).catch(done);
      });
    });

    describe('GetDatasources', function () {

      var fakeSavedDatasources = [
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

      it('select datasources', function (done) {
        kibiSelectHelper.getDatasources().then(function (datasources) {
          expect(datasources).to.have.length(2);
          expect(datasources[0].value).to.be('ds1');
          expect(datasources[0].label).to.be('ds1 datasource');
          expect(datasources[1].value).to.be('ds2');
          expect(datasources[1].label).to.be('ds2 datasource');
          done();
        }).catch(done);
      });
    });

    describe('GetIndexTypes', function () {

      beforeEach(function () {
        init({
          initHttpBackend: true
        });
      });

      it('no index pattern id specified', function (done) {
        kibiSelectHelper.getIndexTypes().then(function (types) {
          expect(types).to.eql([]);
          done();
        });
      });

      it('should get the type of the dog index', function (done) {
        const response = {
          dog: {
            mappings: { animal: {} }
          }
        };
        const getMappingStub = sinon.stub(mappings, 'getMapping').returns(Promise.resolve(response));

        kibiSelectHelper.getIndexTypes('dog').then(function (types) {
          sinon.assert.calledOnce(getMappingStub);
          expect(types).to.have.length(1);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');

          done();
        }).catch(done);
      });

      it('should get the type of all returned indices', function (done) {
        const response = {
          dog: {
            mappings: { animal: {} }
          },
          dogboy: {
            mappings: { hero: {} }
          }
        };
        const getMappingStub = sinon.stub(mappings, 'getMapping').returns(Promise.resolve(response));

        kibiSelectHelper.getIndexTypes('dog*').then(function (types) {
          sinon.assert.calledOnce(getMappingStub);
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');
          expect(types[1].label).to.be('hero');
          expect(types[1].value).to.be('hero');
          done();
        }).catch(done);
      });
    });

    describe('GetFields', function () {

      beforeEach(function () {
        init({
          initIndexPattern: true
        });
      });

      it('should return the fields', function (done) {
        kibiSelectHelper.getFields().then(function (fields) {
          expect(_.find(fields, { label: 'ssl' })).not.to.be.ok();
          expect(_.find(fields, { label: '_id' })).not.to.be.ok();
          expect(_.find(fields, { label: 'area' })).to.be.ok();
          expect(_.find(fields, { label: 'area' }).options.analyzed).to.be.ok();
          expect(_.find(fields, { label: 'custom_user_field' })).to.be.ok();
          expect(_.find(fields, { label: 'custom_user_field' }).options.analyzed).not.to.be.ok();
          done();
        }).catch(done);
      });

      it('should return only date fields ', function (done) {
        kibiSelectHelper.getFields(null, ['date']).then(function (fields) {
          expect(fields.length).to.equal(3);
          expect(_.find(fields, { label: '@timestamp' })).to.be.ok();
          expect(_.find(fields, { label: 'time' })).to.be.ok();
          expect(_.find(fields, { label: 'utc_time' })).to.be.ok();
          done();
        }).catch(done);
      });

      it('should return data without scripted fields if scriptedFields equals false ', function (done) {
        kibiSelectHelper.getFields(null, null, false).then(function (fields) {
          for (var i = 0; i < fields.length; i++) {
            expect(fields[i].options.scripted).not.to.be(true);
          }
          done();
        }).catch(done);
      });

      it('should return data with scripted fields if scriptedFields equals true ', function (done) {
        kibiSelectHelper.getFields(null, null, true).then(function (fields) {
          for (var i = 0; i < fields.length; i++) {
            expect(fields[i].options.scripted).not.to.be(undefined);
          }
          done();
        }).catch(done);
      });
    });

    describe('GetIndexesId', function () {

      beforeEach(function () {
        init({
          stubIndexPatternsGetIds: true
        });
      });

      it('should return the ID of indices', function (done) {
        kibiSelectHelper.getIndexesId().then(function (ids) {
          expect(ids).to.have.length(2);
          expect(ids[0].label).to.be('aaa');
          expect(ids[0].value).to.be('aaa');
          expect(ids[1].label).to.be('bbb');
          expect(ids[1].value).to.be('bbb');
          done();
        }).catch(done);
      });
    });

    describe('GetQueryVariables', function () {

      var fakeSavedDatasources = [
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

      var fakeSavedQueries = [
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


      it('should returned undefined if no query ID is passed', function (done) {
        kibiSelectHelper.getQueryVariables()
        .then(function (variables) {
          done('should fail! ' + variables);
        })
        .catch(function (err) {
          expect(err.message).to.equal('Unable to get variables of unknown query');
          done();
        });
      });

      it('should return empty variables of the REST query', function (done) {
        kibiSelectHelper.getQueryVariables('rest').then(function (variables) {
          expect(variables.fields).to.have.length(0);
          expect(variables.datasourceType).to.equal('rest');
          done();
        }).catch(done);
      });

      it('should return the variables of the REST query', function (done) {
        kibiSelectHelper.getQueryVariables('rest_with_query_variables').then(function (variables) {
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
          done();
        }).catch(done);
      });

      it('should return the variables of the SQL query', function (done) {
        kibiSelectHelper.getQueryVariables('sql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('mysql');
          done();
        }).catch(done);
      });

      it('should return the variables of the SPARQL query', function (done) {
        kibiSelectHelper.getQueryVariables('sparql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('?name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('sparql_http');
          done();
        }).catch(done);
      });

      it('should return an error if query is unknown', function (done) {
        kibiSelectHelper.getQueryVariables('boo')
        .catch(function (err) {
          expect(err.message).to.be('Query with id [boo] was not found');
          done();
        });
      });

      it('should return an error if query has no or unsupported datasource type', function (done) {
        kibiSelectHelper.getQueryVariables('nodatasource')
        .catch(function (err) {
          expect(err.message).to.be('SavedQuery [nodatasource] does not have datasourceId parameter');
          done();
        });
      });
    });

    describe('GetIconType', function () {
      it('should return available icon types', function (done) {
        kibiSelectHelper.getIconType().then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('Font Awesome');
          expect(types[0].value).to.be('fontawesome');
          expect(types[1].label).to.be('Parameterized Relative Path');
          expect(types[1].value).to.be('relpath');
          done();
        }).catch(done);
      });
    });

    describe('getLabelType', function () {
      it('should return available icon types', function (done) {
        kibiSelectHelper.getLabelType().then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('Document Field');
          expect(types[0].value).to.be('docField');
          expect(types[1].label).to.be('Parameterized Field');
          expect(types[1].value).to.be('paramField');
          done();
        }).catch(done);
      });
    });

    describe('getDashboardsForButton', function () {
      var fakeSavedDashboards = [
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
      var fakeSavedSearches = [
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
      let relations = {
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

      it('should not propose any dashboard if the relation does not exist', function (done) {
        const options = {
          indexRelationId: 'art*//path-a/comp*//path-c'
        };

        config.set('kibi:relations', {
          relationsIndices: []
        });
        kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(dashboards).to.have.length(0);
          done();
        })
        .catch(done);
      });

      it('should not propose any dashboard if the relation does not exist even if the paired dashboard is set', function (done) {
        const options = {
          indexRelationId: 'art*//path-a/comp*//path-c',
          otherDashboardId: 'Companies'
        };

        config.set('kibi:relations', {
          relationsIndices: []
        });
        kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(dashboards).to.have.length(0);
          done();
        })
        .catch(done);
      });

      it('no options should return all dashboards with savedSearchId set', function (done) {
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
        kibiSelectHelper.getDashboardsForButton({}).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
          done();
        })
        .catch(done);
      });

      it('pass only the otherDashboardId and NO indexRelationId should return all dashboards with savedSearchId set', function (done) {
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
        kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
          done();
        })
        .catch(done);
      });

      it('pass indexRelationId and otherDashboardId in the option should filter the dashboards', function (done) {
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
        kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
          done();
        })
        .catch(done);
      });

      it('pass self join indexRelationId and otherDashboardId in the option should filter the dashboards', function (done) {
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
        kibiSelectHelper.getDashboardsForButton(options).then(function (dashboards) {
          expect(_.sortBy(dashboards, 'value')).to.be.eql(_.sortBy(expectedDashboards, 'value'));
          done();
        })
        .catch(done);
      });
    });

  });
});
