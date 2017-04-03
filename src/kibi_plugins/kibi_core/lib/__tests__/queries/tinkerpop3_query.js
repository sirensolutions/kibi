import { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } from '../../_symbols';
import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import TinkerPop3Query from '../../queries/tinkerpop3_query';
import rp from 'request-promise';

const fakeServer = {
  log: function (tags, data) {},
  config() {
    return {
      get(key) {
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
      getCluster() {
        return {
          callWithInternalUser(method, params) {
            if (method === 'search') {
              switch (params.type) {
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
                    hits : {
                      total : 2,
                      max_score : 1.0,
                      hits : [
                        {
                          _index: '.kibi',
                          _type: 'config',
                          _id: '0.3.2',
                          _source: {
                            'kibi:relations': JSON.stringify({
                              relationsIndices: [],
                              relationsDashboards: [],
                              relationsIndicesSerialized: {},
                              relationsDashboardsSerialized: {}
                            }),
                            'kibi:relationalPanel': true,
                            defaultIndex: 'company',
                            buildNum: 8467
                          }
                        },
                        {
                          _index: '.kibi',
                          _type: 'config',
                          _id: '0.1.1',
                          _source: {
                            'kibi:relations': JSON.stringify({
                              relationsIndices: [],
                              relationsDashboards: [],
                              relationsIndicesSerialized: {},
                              relationsDashboardsSerialized: {}
                            }),
                            'kibi:relationalPanel': true,
                            defaultIndex: 'company',
                            buildNum: 8467
                          }
                        }
                      ]
                    }
                  });
                default:
                  return Promise.reject(new Error(`No documents to return for ${JSON.stringify(params, null, ' ')}`));
              }
            }
            return Promise.reject(new Error(`Unexpected method: ${method}`));
          }
        };
      }
    }
  }
};

const fakeGraphResponse = [{
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

const fakeTinkerpop3Result = {
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

const queryDefinition = {
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

  let rpStub;

  beforeEach(function () {
    rpStub = sinon.stub(rp, 'Request').returns(Promise.resolve(new Error('Document does not exists')));
  });

  describe('fetchResults', function () {

    it('simple get request', function () {
      const tinkerPop3Query = new TinkerPop3Query(fakeServer, {
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

      rpStub.returns(Promise.resolve(fakeGraphResponse));
      return tinkerPop3Query.fetchResults('').then(function (res) {
        expect(res.result).to.eql(fakeTinkerpop3Result);
      });
    });
  });

  describe('correct arguments are passed to generateCacheKey', function () {

    it('fetchResults', function () {
      const tinkerPop3Query = new TinkerPop3Query(fakeServer, queryDefinition, cacheMock);

      const generateCacheKeySpy = sinon.spy(tinkerPop3Query, 'generateCacheKey');

      rpStub.returns(Promise.resolve(fakeGraphResponse));
      return tinkerPop3Query.fetchResults({credentials: {username: 'fred'}}).then(function (res) {
        expect(res.result).to.eql(fakeTinkerpop3Result);
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'http://localhost:3000/graph/queryBatch', '', undefined, undefined, 'fred');
      });
    });

    it('checkIfItIsRelevant', function () {
      const tinkerPop3Query = new TinkerPop3Query(fakeServer, queryDefinition, cacheMock);

      const generateCacheKeySpy = sinon.spy(tinkerPop3Query, 'generateCacheKey');

      return tinkerPop3Query.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(QUERY_RELEVANT);
        sinon.assert.notCalled(generateCacheKeySpy);
      });
    });

  });

});
