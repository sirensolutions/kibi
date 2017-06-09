import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a query with the tinkerpop3 datasourceId
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'datasource',
      _id: 'Gremlin-Server'
    }
  },
  {
    kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
    version: 1,
    datasourceParams: '{"timeout":"10000","max_age":3600000,"url":"https://127.0.0.1:8061/graph/queryBatch"}',
    datasourceType: 'tinkerpop3',
    description: '',
    title: 'Kibi Gremlin Server'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'query-test'
    }
  },
  {
    activationQuery: '',
    activation_rules: '[]',
    datasourceId: 'Gremlin-Server',
    description: '',
    kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_status_code: 200,
    rest_variables: '[]',
    resultQuery: 'some gremlin query',
    tags: [],
    title: 'Gremlin query',
    version: 2
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'Companies-in-the-same-domain'
    }
  },
  {
    activationQuery: '',
    activation_rules: '[]',
    datasourceId: 'crunchbase-datasource',
    description: '',
    kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_status_code: 200,
    rest_variables: '[]',
    resultQuery: 'select distinct company...',
    tags: [],
    title: 'Companies in the same domain',
    version: 2
  }
];
