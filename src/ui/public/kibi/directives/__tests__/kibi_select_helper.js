var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
var stSelectHelper;
var config;
var $httpBackend;
var indexPatterns;


describe('Kibi Directives', function () {
  describe('KibiSelect Helper', function () {

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

      ngMock.inject(function ($injector, Private) {
        stSelectHelper = Private(require('ui/kibi/directives/kibi_select_helper'));
        if (options.stubConfig) {
          config = $injector.get('config');
        }
        if (options.initHttpBackend) {
          $httpBackend = $injector.get('$httpBackend');
        }
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
        stSelectHelper.getQueries().then(function (queries) {
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

      afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
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

        $httpBackend.whenGET('/elasticsearch/a/A/_search?size=10').respond(200, ids);
        stSelectHelper.getDocumentIds('a', 'A').then(function (data) {
          expect(data).to.have.length(2);
          expect(data[0]).to.eql({ label: 'id1', value: 'id1' });
          expect(data[1]).to.eql({ label: 'id2', value: 'id2' });
          done();
        }).catch(done);
        $httpBackend.flush();
      });

      it('should return empty set when the index is not passed', function (done) {
        stSelectHelper.getDocumentIds('', 'A').then(function (data) {
          expect(data).to.have.length(0);
          done();
        }).catch(done);
      });

      it('should return empty set when the type is not passed', function (done) {
        stSelectHelper.getDocumentIds('a', '').then(function (data) {
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
        stSelectHelper.getTemplates().then(function (templates) {
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
        stSelectHelper.getSavedSearches().then(function (savedSearches) {
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
        stSelectHelper.getDashboards().then(function (dashboards) {
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
        stSelectHelper.getDatasources().then(function (datasources) {
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

      afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      it('no index pattern id specified', function (done) {
        stSelectHelper.getIndexTypes().then(function (types) {
          expect(types).to.eql([]);
          done();
        });
      });

      it('should get the type of the dog index', function (done) {
        var data = {
          dog: {
            mappings: { animal: {} }
          }
        };

        $httpBackend.whenGET('/elasticsearch/dog/_mappings').respond(200, data);
        stSelectHelper.getIndexTypes('dog').then(function (types) {
          expect(types).to.have.length(1);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');
          done();
        }).catch(done);
        $httpBackend.flush();
      });

      it('should get the type of all returned indices', function (done) {
        var data = {
          dog: {
            mappings: { animal: {} }
          },
          dogboy: {
            mappings: { hero: {} }
          }
        };

        $httpBackend.whenGET('/elasticsearch/dog*/_mappings').respond(200, data);
        stSelectHelper.getIndexTypes('dog*').then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('animal');
          expect(types[0].value).to.be('animal');
          expect(types[1].label).to.be('hero');
          expect(types[1].value).to.be('hero');
          done();
        }).catch(done);
        $httpBackend.flush();
      });
    });

    describe('GetFields', function () {

      beforeEach(function () {
        init({
          initIndexPattern: true
        });
      });

      it('should return the fields', function (done) {
        stSelectHelper.getFields().then(function (fields) {
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
        stSelectHelper.getFields(null, ['date']).then(function (fields) {
          expect(fields.length).to.equal(3);
          expect(_.find(fields, { label: '@timestamp' })).to.be.ok();
          expect(_.find(fields, { label: 'time' })).to.be.ok();
          expect(_.find(fields, { label: 'utc_time' })).to.be.ok();
          done();
        }).catch(done);
      });

      it('should return data without scripted fields if scriptedFields equals false ', function (done) {
        stSelectHelper.getFields(null, null, false).then(function (fields) {
          for (var i = 0; i < fields.length; i++) {
            expect(fields[i].options.scripted).not.to.be(true);
          }
          done();
        }).catch(done);
      });

      it('should return data with scripted fields if scriptedFields equals true ', function (done) {
        stSelectHelper.getFields(null, null, true).then(function (fields) {
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
        stSelectHelper.getIndexesId().then(function (ids) {
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
        stSelectHelper.getQueryVariables()
        .then(function (variables) {
          done('should fail! ' + variables);
        })
        .catch(function (err) {
          expect(err.message).to.equal('Unable to get variables of unknown query');
          done();
        });
      });

      it('should return empty variables of the REST query', function (done) {
        stSelectHelper.getQueryVariables('rest').then(function (variables) {
          expect(variables.fields).to.have.length(0);
          expect(variables.datasourceType).to.equal('rest');
          done();
        }).catch(done);
      });

      it('should return the variables of the REST query', function (done) {
        stSelectHelper.getQueryVariables('rest_with_query_variables').then(function (variables) {
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
        stSelectHelper.getQueryVariables('sql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('mysql');
          done();
        }).catch(done);
      });

      it('should return the variables of the SPARQL query', function (done) {
        stSelectHelper.getQueryVariables('sparql').then(function (variables) {
          expect(variables.fields).to.have.length(1);
          expect(variables.fields[0].label).to.equal('?name');
          expect(variables.fields[0].value).to.equal('name');
          expect(variables.datasourceType).to.equal('sparql_http');
          done();
        }).catch(done);
      });

      it('should return an error if query is unknown', function (done) {
        stSelectHelper.getQueryVariables('boo')
        .catch(function (err) {
          expect(err.message).to.be('Query with id [boo] was not found');
          done();
        });
      });

      it('should return an error if query has no or unsupported datasource type', function (done) {
        stSelectHelper.getQueryVariables('nodatasource')
        .catch(function (err) {
          expect(err.message).to.be('SavedQuery [nodatasource] does not have datasourceId parameter');
          done();
        });
      });
    });

    describe('getJoinRelations', function () {

      beforeEach(function () {
        init({
          stubConfig: true
        });
      });

      it('should return the list of relations between index patterns', function (done) {
        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'mylabel',
              id: 'myid'
            }
          ]
        };

        config.set('kibi:relations', relations);
        stSelectHelper.getJoinRelations().then(function (relations) {
          expect(relations).to.have.length(1);
          expect(relations[0].label).to.be('mylabel');
          expect(relations[0].value).to.be('myid');
          done();
        }).catch(done);
      });
    });

    describe('GetIconType', function () {
      it('should return available icon types', function (done) {
        stSelectHelper.getIconType().then(function (types) {
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
        stSelectHelper.getLabelType().then(function (types) {
          expect(types).to.have.length(2);
          expect(types[0].label).to.be('Document Field');
          expect(types[0].value).to.be('docField');
          expect(types[1].label).to.be('Parameterized Field');
          expect(types[1].value).to.be('paramField');
          done();
        }).catch(done);
      });
    });

    describe('getRelationsForButton', function () {

      beforeEach(function () {
        var fakedSavedDashboards = [
          {
            id: 'dash-a',
            title: 'A',
            savedSearchId: 'savedSearchA'
          },
          {
            id: 'dash-b',
            title: 'B',
            savedSearchId: 'savedSearchB'
          },
          {
            id: 'dash-c',
            title: 'C',
            savedSearchId: 'savedSearchC'
          }
        ];

        var fakeSavedSearches = [
          {
            id: 'savedSearchA',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({index: 'index-a'})
            }
          },
          {
            id: 'savedSearchB',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({index: 'index-b'})
            }
          },
          {
            id: 'savedSearchC',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({index: 'index-c'})
            }
          }
        ];

        var relations = {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'index-a',
                  path: 'path-a'
                },
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                }
              ],
              label: 'label-a-b',
              id: 'index-a//path-a/index-b//path-b'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c'
                }
              ],
              label: 'label-b-c',
              id: 'index-b//path-b/index-c//path-c'
            },
            {
              indices: [
                {
                  indexPatternId: 'index-b',
                  path: 'path-b1'
                },
                {
                  indexPatternId: 'index-c',
                  path: 'path-c1'
                }
              ],
              label: 'label-b-c',
              id: 'index-b//path-b1/index-c//path-c1'
            }
          ]
        };

        init({
          savedDashboards: fakedSavedDashboards,
          savedSearches: fakeSavedSearches,
          stubConfig: true
        });

        config.set('kibi:relations', relations);
      });


      it('should return an empty set if no options set', function (done) {
        stSelectHelper.getRelationsForButton().then(function (relations) {
          expect(relations).to.have.length(0);
          done();
        }).catch(done);
      });

      describe('only options.sourceDashboardId set', function () {
        it('should return all 3 if sourceDashboardId == dash-b', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-b'
          }).then(function (relations) {
            expect(relations).to.have.length(3);
            expect(relations[0].label).to.equal('label-a-b');
            expect(relations[1].label).to.equal('index-c/path-c <-> index-b/path-b');
            expect(relations[2].label).to.equal('index-c/path-c1 <-> index-b/path-b1');
            done();
          }).catch(done);
        });

        it('should return only 1 if sourceDashboardId == dash-a', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-a'
          }).then(function (relations) {
            expect(relations).to.have.length(1);
            expect(relations[0].label).to.equal('label-a-b');
            done();
          }).catch(done);
        });

        it('should return only 2 if sourceDashboardId == dash-c', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-c'
          }).then(function (relations) {
            expect(relations).to.have.length(2);
            expect(relations[0].label).to.equal('index-c/path-c <-> index-b/path-b');
            expect(relations[1].label).to.equal('index-c/path-c1 <-> index-b/path-b1');
            done();
          }).catch(done);
        });

        it('should reject if sourceDashboardId == dash-DO-NOT-EXIST', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-DO-NOT-EXIST'
          }).then(function (relations) {
            done(new Error('Should reject'));
          }).catch(function () {
            done();
          });
        });
      });

      describe('only options.targetDashboardId set', function () {
        it('should return all 3 if targetDashboardId == dash-b', function (done) {
          stSelectHelper.getRelationsForButton({
            targetDashboardId: 'dash-b'
          }).then(function (relations) {
            expect(relations).to.have.length(3);
            expect(relations[0].label).to.equal('label-a-b');
            expect(relations[1].label).to.equal('index-c/path-c <-> index-b/path-b');
            expect(relations[2].label).to.equal('index-c/path-c1 <-> index-b/path-b1');
            done();
          }).catch(done);
        });

        it('should return only 1 if targetDashboardId == dash-a', function (done) {
          stSelectHelper.getRelationsForButton({
            targetDashboardId: 'dash-a'
          }).then(function (relations) {
            expect(relations).to.have.length(1);
            expect(relations[0].label).to.equal('label-a-b');
            done();
          }).catch(done);
        });

        it('should return only 2 if targetDashboardId == dash-c', function (done) {
          stSelectHelper.getRelationsForButton({
            targetDashboardId: 'dash-c'
          }).then(function (relations) {
            expect(relations).to.have.length(2);
            expect(relations[0].label).to.equal('index-b/path-b <-> index-c/path-c');
            expect(relations[1].label).to.equal('index-b/path-b1 <-> index-c/path-c1');
            done();
          }).catch(done);
        });

        it('should reject if targetDashboardId == dash-DO-NOT-EXIST', function (done) {
          stSelectHelper.getRelationsForButton({
            targetDashboardId: 'dash-DO-NOT-EXIST'
          }).then(function (relations) {
            done(new Error('Should reject'));
          }).catch(function () {
            done();
          });
        });

      });

      describe('both options.sourceDashboardId and options.targetDashboardId are set', function () {

        it('should return 1 if sourceDashboardId == dash-a and targetDashboardId == dash-b', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-a',
            targetDashboardId: 'dash-b'
          }).then(function (relations) {
            expect(relations).to.have.length(1);
            expect(relations[0].label).to.equal('label-a-b');
            done();
          }).catch(done);
        });

        it('should return 1 if sourceDashboardId == dash-b and targetDashboardId == dash-a', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-b',
            targetDashboardId: 'dash-a'
          }).then(function (relations) {
            expect(relations).to.have.length(1);
            expect(relations[0].label).to.equal('label-a-b');
            done();
          }).catch(done);
        });

        it('should return 2 if sourceDashboardId == dash-b and targetDashboardId == dash-c', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-b',
            targetDashboardId: 'dash-c'
          }).then(function (relations) {
            expect(relations).to.have.length(2);
            expect(relations[0].label).to.equal('index-b/path-b <-> index-c/path-c');
            expect(relations[1].label).to.equal('index-b/path-b1 <-> index-c/path-c1');
            done();
          }).catch(done);
        });

        it('should return 2 if sourceDashboardId == dash-c and targetDashboardId == dash-b', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-c',
            targetDashboardId: 'dash-b'
          }).then(function (relations) {
            expect(relations).to.have.length(2);
            expect(relations[0].label).to.equal('index-c/path-c <-> index-b/path-b');
            expect(relations[1].label).to.equal('index-c/path-c1 <-> index-b/path-b1');
            done();
          }).catch(done);
        });

        it('should reject if sourceDashboardId == dash-a and targetDashboardId == dash-DO-NOT-EXIST', function (done) {
          stSelectHelper.getRelationsForButton({
            sourceDashboardId: 'dash-a',
            targetDashboardId: 'dash-DO-NOT-EXIST'
          })
          .then(function (relations) {
            done(new Error('Should reject'));
          }).catch(function (e) {
            // ok
            done();
          });
        });
      });

    });
  });
});
