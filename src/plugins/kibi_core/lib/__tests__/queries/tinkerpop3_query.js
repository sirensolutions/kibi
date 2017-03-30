var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../../_symbols');
var mockery = require('mockery');
var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');

var fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
        if (key === 'elasticsearch.url') {
          return 'http://localhost:12345';
        } else if (key === 'kibana.index') {
          return '.kibi';
        } else if (key === 'pkg') {
          return {
            kibiVersion: '0.3.2'
          };
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      client: {
        search: function (options) {
          switch (options.type) {
            case 'index-pattern':
              return Promise.resolve({
                hits: {
                  hits: [
                    { _id: 'investment' },
                    { _id: 'article' },
                    { _id: 'investor' },
                    { _id: 'company' }
                  ]
                }
              });
            case 'config':
              return Promise.resolve({
                took : 1,
                timed_out : false,
                _shards : {
                  total : 5,
                  successful : 5,
                  failed : 0
                },
                hits : {
                  total : 2,
                  max_score : 1.0,
                  hits : [
                    {
                      _index: '.kibi',
                      _type: 'config',
                      _id: '0.3.2',
                      _score: 1,
                      _source: {
                        'kibi:relations': '{\"relationsIndices\":[],\"relationsDashboards\":[],'
                          + '\"relationsIndicesSerialized\":{},\"relationsDashboardsSerialized\":{}}',
                        'kibi:relationalPanel': true,
                        defaultIndex: 'company',
                        buildNum: 8467
                      }
                    },
                    {
                      _index: '.kibi',
                      _type: 'config',
                      _id: '0.1.1',
                      _score: 1,
                      _source: {
                        'kibi:relations': '{\"relationsIndices\":[],\"relationsDashboards\":[],'
                          + '\"relationsIndicesSerialized\":{},\"relationsDashboardsSerialized\":{}}',
                        'kibi:relationalPanel': true,
                        defaultIndex: 'company',
                        buildNum: 8467
                      }
                    }
                  ]
                }
              });
          }
          return Promise.reject(new Error('No documents to return for ' + options));
        }
      }
    }
  }
};

var fakeGraphResponse = [{
  queryActivated: true,
  data: {
    result: {
      status: 200,
      vertices: [
        {
          vertexI: 'AVLqM7lpdE4DXv4PVDI2',
          type: 'Investor',
          indexName: 'investor',
          properties: {
            blog_feed_url: '',
            founded_month: '04',
            blog_url: 'http://500.co/blog/',
            city: 'New York',
            homepage_url: 'http://500.co',
            birth_date: '',
            countrycode: 'USA',
            twitter_username: '500startups',
            description: 'Venture Firm',
            created_at: 'Fri Jul 30 12:52:31 UTC 2010',
            statecode: 'NY',
            investortype: 'fin-org',
            founded_date: '0006-10-01 00:00:00',
            affiliation_name: '',
            updated_at: 'Mon Apr 29 11:39:59 UTC 2013',
            hasstatus: '',
            founded_yea: '2010',
            alias_list: '',
            id: 'financial-organization/investor/500-startups',
            first_name: '',
            overview: '',
            category_code: '',
            indexName: 'investor',
            last_name: '',
            label: '500 Startups',
            url: 'http://www.crunchbase.com/financial-organization/500-startups',
            email_address: '',
            birthplace: '',
            phone_number: '',
            deadpooled_date: '',
            permalink: '500-startups',
            web_presence: ''
          }
        }
      ],
      edges: []
    },
    ids: [],
    queryActivated: true,
    head: {
      'vars': []
    },
    config: {
      id: 'Gremlin-Query',
      templateVars: {
        label: 'Preview'
      },
      open: true
    },
    results: {
      bindings: []
    },
    debug: {
      sentDatasourceId: 'remlin-Datasource',
      sentResultQuery: 'g.V(\"AVLqM7lpdE4DXv4PVDI2\")',
      queryExecutionTime: 56
    },
    id: 'afbf795e-9b27-47f7-b945-41520e9f1aed'
  },
  html: ''
}];

var fakeTinkerpop3Result = {
  queryActivated: true,
  data: {
    result: {
      status: 200,
      vertices: [
        {
          vertexI: 'AVLqM7lpdE4DXv4PVDI2',
          type: 'Investor',
          indexName: 'investor',
          properties: {
            blog_feed_url: '',
            founded_month: '04',
            blog_url: 'http://500.co/blog/',
            city: 'New York',
            homepage_url: 'http://500.co',
            birth_date: '',
            countrycode: 'USA',
            twitter_username: '500startups',
            description: 'Venture Firm',
            created_at: 'Fri Jul 30 12:52:31 UTC 2010',
            statecode: 'NY',
            investortype: 'fin-org',
            founded_date: '0006-10-01 00:00:00',
            affiliation_name: '',
            updated_at: 'Mon Apr 29 11:39:59 UTC 2013',
            hasstatus: '',
            founded_yea: '2010',
            alias_list: '',
            id: 'financial-organization/investor/500-startups',
            first_name: '',
            overview: '',
            category_code: '',
            indexName: 'investor',
            last_name: '',
            label: '500 Startups',
            url: 'http://www.crunchbase.com/financial-organization/500-startups',
            email_address: '',
            birthplace: '',
            phone_number: '',
            deadpooled_date: '',
            permalink: '500-startups',
            web_presence: ''
          }
        }
      ],
      edges: []
    },
    ids: [],
    queryActivated: true,
    head: {
      'vars': []
    },
    config: {
      id: 'Gremlin-Query',
      templateVars: {
        label: 'Preview'
      },
      open: true
    },
    results: {
      bindings: []
    },
    debug: {
      sentDatasourceId: 'remlin-Datasource',
      sentResultQuery: 'g.V(\"AVLqM7lpdE4DXv4PVDI2\")',
      queryExecutionTime: 56
    },
    id: 'afbf795e-9b27-47f7-b945-41520e9f1aed'
  },
  html: ''
};

const cacheMock = {
  get(key) {
    return;
  },
  set(key, value, time) {}
};

var queryDefinition = {
  activationQuery: '',
  rest_method: 'GET',
  datasource: {
    datasourceClazz: {
      datasource: {
        datasourceParams: {
          url: 'http://localhost:3000/graph/queryBatch',
          cache_enabled: true,
          timeout: 1000
        }
      },
      populateParameters: function () {
        return '';
      }
    }
  }
};


describe('TinkerPop3Query', function () {

  before(function (done) {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('request-promise', function (rpOptions) {

      // here return different resp depends on rpOptions.href
      if (rpOptions.uri.indexOf('http://localhost:3000/graph/queryBatch') !== -1) {
        return Promise.resolve(fakeGraphResponse);
      } else {
        return Promise.reject(new Error('Document does not exists'));
      }
    });

    done();
  });

  after(function (done) {
    mockery.disable();
    mockery.deregisterAll();
    done();
  });

  describe('fetchResults', function () {

    it('simple get request', function (done) {
      var TinkerPop3Query = require('../../queries/tinkerpop3_query');
      var tinkerPop3Query = new TinkerPop3Query(fakeServer, {
        activationQuery: '',
        rest_method: 'GET',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/graph/queryBatch',
                timeout: '1000'
              }
            },
            populateParameters: function () {
              return '';
            }
          }
        }
      });

      tinkerPop3Query.fetchResults('').then(function (res) {
        expect(res.result).to.eql(fakeTinkerpop3Result);
        done();
      }).catch(done);
    });
  });

  describe('correct arguments are passed to generateCacheKey', function () {

    it('fetchResults', function (done) {
      var TinkerPop3Query = require('../../queries/tinkerpop3_query');
      var tinkerPop3Query = new TinkerPop3Query(fakeServer, queryDefinition, cacheMock);

      var spy = sinon.spy(tinkerPop3Query, 'generateCacheKey');

      tinkerPop3Query.fetchResults({credentials: {username: 'fred'}}).then(function (res) {
        expect(res.result).to.eql(fakeTinkerpop3Result);
        expect(spy.callCount).to.equal(1);
        expect(spy.calledWithExactly('http://localhost:3000/graph/queryBatch', '', undefined, undefined, 'fred')).to.be.ok();

        tinkerPop3Query.generateCacheKey.restore();
        done();
      }).catch(done);
    });

    it('checkIfItIsRelevant', function (done) {
      var TinkerPop3Query = require('../../queries/tinkerpop3_query');
      var tinkerPop3Query = new TinkerPop3Query(fakeServer, queryDefinition, cacheMock);

      var spy = sinon.spy(tinkerPop3Query, 'generateCacheKey');

      tinkerPop3Query.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {

        expect(res).to.equal(QUERY_RELEVANT);
        expect(spy.callCount).to.equal(0);

        tinkerPop3Query.generateCacheKey.restore();
        done();
      }).catch(done);
    });

  });

});
