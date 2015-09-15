define(function (require) {
  var stSelectHelper;
  var config;
  var $httpBackend;
  var _ = require('lodash');

  describe('Kibi Directives', function () {
    describe('StSelect Helper', function () {

      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        module('kibana');

        module('kibana', function ($provide) {
          $provide.constant('configFile', {
            datasources: [
              {
                id: 'ds1',
                type: 'sparql'
              },
              {
                id: 'ds2',
                type: 'mysql'
              },
              {
                id: 'ds3',
                type: 'rest'
              }
            ]
          });
        });

        module('kibana/courier', function ($provide) {
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

        module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', function (Promise) {
            return {
              get: function (id) {
                var query;

                switch (id) {
                  case 'sparql':
                    query = {
                      st_resultQuery: 'select ?name { ?s ?p ?o }',
                      st_datasourceId: 'ds1'
                    };
                    break;
                  case 'sql':
                    query = {
                      st_resultQuery: 'select name from person',
                      st_datasourceId: 'ds2'
                    };
                    break;
                  case 'rest':
                    query = {
                      st_resultQuery: '',
                      st_datasourceId: 'ds3'
                    };
                    break;
                  case 'nodatasource':
                    query = {
                      st_resultQuery: '',
                      st_datasourceId: ''
                    };
                    break;
                  default:
                    return Promise.reject('What is this id? ' + id);
                }
                return Promise.resolve(query);
              }
            };
          });
        });

        module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', require('fixtures/saved_dashboards'));
        });

        module('kibana/index_patterns', function ($provide) {
          $provide.service('indexPatterns', function (Promise, Private) {
            var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
            return {
              get: function (id) {
                return Promise.resolve(indexPattern);
              }
            };
          });
        });

        inject(function ($injector, Private) {
          config = $injector.get('config');
          stSelectHelper = Private(require('directives/st_select_helper'));
          $httpBackend = $injector.get('$httpBackend');
        });
      });

      afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      function fakeHits() {
        var hits = { hits: { hits: [] } };

        for (var i = 0; i < arguments.length; i++) {
          hits.hits.hits.push(arguments[i]);
        }
        return hits;
      }

      describe('GetQueries', function () {
        it('select queries', function (done) {
          var data = fakeHits({
            _id: 'q1',
            _source: {
              title: 'q1',
              st_tags: []
            }
          },
          {
            _id: 'q2',
            _source: {
              title: 'q2',
              st_tags: [ 'tag2', '42' ]
            }
          });

          $httpBackend.whenGET('elasticsearch/.kibi/query/_search?size=100').respond(200, data);
          stSelectHelper.getQueries().then(function (queries) {
            expect(queries).to.have.length(2);
            expect(queries[0].group).to.be('No tag');
            expect(queries[1].group).to.be('tag2,42');
            done();
          }).catch(done);
          $httpBackend.flush();
        });

        it('select queries without hits', function (done) {
          var data = { aaa: 'aaa' };
          $httpBackend.whenGET('elasticsearch/.kibi/query/_search?size=100').respond(200, data);
          stSelectHelper.getQueries().then(function (queries) {
            expect(queries).to.be(undefined);
            done();
          }).catch(done);
          $httpBackend.flush();
        });

        it('select queries with error', function (done) {
          $httpBackend.whenGET('elasticsearch/.kibi/query/_search?size=100').respond(404, '');
          stSelectHelper.getQueries()
            .catch(function () {
              done();
            });
          $httpBackend.flush();
        });
      });

      describe('GetObjects', function () {
        it('select saved searches or templates', function (done) {
          var savedSearches = fakeHits({
            _id: 'ss1',
            _source: {
              title: 'ss1',
            }
          },
          {
            _id: 'ss2',
            _source: {
              title: 'ss2'
            }
          });

          $httpBackend.whenGET('elasticsearch/.kibi/search/_search?size=100').respond(200, savedSearches);
          stSelectHelper.getObjects('search').then(function (searches) {
            expect(searches).to.have.length(2);
            done();
          }).catch(done);
          $httpBackend.flush();
        });
      });

      describe('GetDashboards', function () {
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
        it('select datasources', function (done) {
          stSelectHelper.getDatasources().then(function (datasources) {
            expect(datasources).to.have.length(1);
            expect(datasources[0].label).to.be('crunchbase-datasource');
            expect(datasources[0].value).to.be('crunchbase-datasource');
            done();
          }).catch(done);
        });
      });

      describe('GetIndexTypes', function () {
        it('no index pattern id specified', function () {
          expect(stSelectHelper.getIndexTypes()).to.be(undefined);
        });

        it('should get the type of the dog index', function (done) {
          var data = {
            dog: {
              mappings: { animal: {} }
            }
          };

          $httpBackend.whenGET('elasticsearch/dog/_mappings').respond(200, data);
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

          $httpBackend.whenGET('elasticsearch/dog*/_mappings').respond(200, data);
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
      });

      describe('GetIndexesId', function () {
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
        it('should returned undefined if no query ID is passed', function () {
          expect(stSelectHelper.getQueryVariables()).not.to.be.ok();
        });

        it('should return the variables of the REST query', function (done) {
          stSelectHelper.getQueryVariables('rest').then(function (variables) {
            expect(variables[0]).to.have.length(0);
            expect(variables[1]).to.be('rest');
            done();
          }).catch(done);
        });

        it('should return the variables of the SQL query', function (done) {
          stSelectHelper.getQueryVariables('sql').then(function (variables) {
            expect(variables[0]).to.have.length(1);
            expect(variables[0][0].label).to.be('name');
            expect(variables[0][0].value).to.be('name');
            expect(variables[1]).to.be('mysql');
            done();
          }).catch(done);
        });

        it('should return the variables of the SPARQL query', function (done) {
          stSelectHelper.getQueryVariables('sparql').then(function (variables) {
            expect(variables[0]).to.have.length(1);
            expect(variables[0][0].label).to.be('?name');
            expect(variables[0][0].value).to.be('name');
            expect(variables[1]).to.be('sparql');
            done();
          }).catch(done);
        });

        it('should return an error if query is unknown', function (done) {
          stSelectHelper.getQueryVariables('boo')
          .catch(function (err) {
            expect(err).to.be('What is this id? boo');
            done();
          });
        });

        it('should return an error if query has no or unsupported datasource type', function (done) {
          stSelectHelper.getQueryVariables('nodatasource')
          .catch(function (err) {
            expect(err.message).to.be('Unknown datasource type: undefined');
            done();
          });
        });
      });
    });
  });
});
