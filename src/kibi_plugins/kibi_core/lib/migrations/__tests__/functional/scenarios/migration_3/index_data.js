import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - a configuration
 * - a visualization having the type "kibi-data-table" at version 1 (data-table-1)
 * - a visualization having the type "kibi-data-table" at version 1 having no queries (data-table-1-nq)
 * - a visualization having the type "kibi-data-table" at version 1 having no params (data-table-1-np)
 * - a visualization having the type "kibi-query-viewer" at version 1 (query-viewer-1)
 * - a visualization having the type "kibi-query-viewer" at version 1 having no params (query-viewer-1-np)
 * - a visualization having the type "kibi-query-viewer" at version 1 having no queries (query-viewer-1-nq)
 * - a visualization having the type "kibi-data-table" at version 2 (data-table-2)
 * - a visualization having the type "kibi-query-viewer" at version 2 (query-viewer-2)
 * - a visualization having the type "kibi-data-table" at version 2 with version not set (data-table-2-fu)
 * - a visualization having the type "kibi-query-viewer" at version 2 with version not set (query-viewer-2-fu)
 * - a visualization having the type "table" with an external query aggregator at version 1 (articles-sql-1)
 * - a visualization having the type "table" with an external query aggregator having no queries at version 1 (articles-sql-1-nq)
 * - a visualization having the type "table" with an external query aggregator having no params at version 1 (articles-sql-1-np)
 * - a visualization having the type "table" with an external query aggregator at version 2 (articles-sql-2)
 * - a visualization having the type "table" with an external query aggregator at version 2 with version not set (articles-sql-1-fu)
 * - a template at version 2
 * - a query at version 2
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: pkg.kibi_version
    }
  },
  {
    buildNum: pkg.build.number,
    'dateFormat:tz': 'UTC'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'articles-sql-1'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Articles',
    title: 'Articles aggregated by SQL queries',
    version: 1,
    visState: JSON.stringify({
      title: 'Articles aggregated by SQL queries',
      type: 'table',
      params: {
        perPage: 10,
        queryFieldName: 'Query',
        showMeticsAtAllLevels: false,
        showPartialRows: false
      },
      aggs: [
        {
          id: '1',
          type: 'cardinality',
          schema: 'metric',
          params: {
            field: 'companyid'
          }
        },
        {
          id: '2',
          type: 'count',
          schema: 'metric',
          params: {}
        },
        {
          id: '3',
          type: 'external_query_terms_filter',
          schema: 'bucket',
          params: {
            queryIds: [
              {
                id: 'Company-Competitors',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              },
              {
                id: 'Top-5-Companies',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              }
            ]
          }
        }
      ]
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'articles-sql-1-nq'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Articles',
    title: 'Articles aggregated by SQL queries',
    version: 1,
    visState: JSON.stringify({
      title: 'Articles aggregated by SQL queries',
      type: 'table',
      params: {
        perPage: 10,
        queryFieldName: 'Query',
        showMeticsAtAllLevels: false,
        showPartialRows: false
      },
      aggs: [
        {
          id: '1',
          type: 'cardinality',
          schema: 'metric',
          params: {
            field: 'companyid'
          }
        },
        {
          id: '2',
          type: 'count',
          schema: 'metric',
          params: {}
        },
        {
          id: '3',
          type: 'external_query_terms_filter',
          schema: 'bucket',
          params: {}
        }
      ]
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'articles-sql-1-np'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Articles',
    title: 'Articles aggregated by SQL queries',
    version: 1,
    visState: JSON.stringify({
      title: 'Articles aggregated by SQL queries',
      type: 'table',
      params: {
        perPage: 10,
        queryFieldName: 'Query',
        showMeticsAtAllLevels: false,
        showPartialRows: false
      },
      aggs: [
        {
          id: '1',
          type: 'cardinality',
          schema: 'metric',
          params: {
            field: 'companyid'
          }
        },
        {
          id: '2',
          type: 'count',
          schema: 'metric',
          params: {}
        },
        {
          id: '3',
          type: 'external_query_terms_filter',
          schema: 'bucket'
        }
      ]
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'articles-sql-2'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Articles',
    title: 'Articles aggregated by SQL queries',
    version: 1,
    visState: JSON.stringify({
      title: 'Articles aggregated by SQL queries',
      type: 'table',
      params: {
        perPage: 10,
        queryFieldName: 'Query',
        showMeticsAtAllLevels: false,
        showPartialRows: false
      },
      aggs: [
        {
          id: '1',
          type: 'cardinality',
          schema: 'metric',
          params: {
            field: 'companyid'
          }
        },
        {
          id: '2',
          type: 'count',
          schema: 'metric',
          params: {}
        },
        {
          id: '3',
          type: 'external_query_terms_filter',
          schema: 'bucket',
          params: {
            queryDefinitions: [
              {
                queryId: 'Company-Competitors',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              },
              {
                queryId: 'Top-5-Companies',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              }
            ]
          },
          version: 2
        }
      ]
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'articles-sql-2-fu'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Articles',
    title: 'Articles aggregated by SQL queries',
    version: 1,
    visState: JSON.stringify({
      title: 'Articles aggregated by SQL queries',
      type: 'table',
      params: {
        perPage: 10,
        queryFieldName: 'Query',
        showMeticsAtAllLevels: false,
        showPartialRows: false
      },
      aggs: [
        {
          id: '1',
          type: 'cardinality',
          schema: 'metric',
          params: {
            field: 'companyid'
          }
        },
        {
          id: '2',
          type: 'count',
          schema: 'metric',
          params: {}
        },
        {
          id: '3',
          type: 'external_query_terms_filter',
          schema: 'bucket',
          params: {
            queryDefinitions: [
              {
                queryId: 'Company-Competitors',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              },
              {
                queryId: 'Top-5-Companies',
                joinElasticsearchField: 'companyid',
                queryVariableName: 'companyid'
              }
            ]
          }
        }
      ]
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'data-table-1'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Companies',
    title: 'Companies Table',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Companies Table',
      type: 'kibi-data-table',
      params: {
        clickOptions: [
          {
            columnField: 'label',
            targetDashboardId: '',
            type: 'select'
          }
        ],
        columns: ['Why Relevant?'],
        enableQueryFields: true,
        hasEntityDependentQuery: true,
        joinElasticsearchField: 'label-not-analyzed',
        queryFieldName: 'Why Relevant?',
        queryIds: [
          {
            isEntityDependent: true,
            id: 'Company-Competitors',
            queryVariableName: 'competitor'
          }
        ],
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'data-table-1-nq'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Companies',
    title: 'Companies Table',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Companies Table',
      type: 'kibi-data-table',
      params: {
        clickOptions: [
          {
            columnField: 'label',
            targetDashboardId: '',
            type: 'select'
          }
        ],
        columns: ['Why Relevant?'],
        enableQueryFields: true,
        hasEntityDependentQuery: true,
        joinElasticsearchField: 'label-not-analyzed',
        queryFieldName: 'Why Relevant?'
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'data-table-1-np'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Companies',
    title: 'Companies Table',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Companies Table',
      type: 'kibi-data-table',
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'data-table-2'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Companies',
    title: 'Companies Table',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Companies Table',
      type: 'kibi-data-table',
      params: {
        clickOptions: [
          {
            columnField: 'label',
            targetDashboardId: '',
            type: 'select'
          }
        ],
        columns: ['Why Relevant?'],
        enableQueryFields: true,
        hasEntityDependentQuery: true,
        joinElasticsearchField: 'label-not-analyzed',
        queryFieldName: 'Why Relevant?',
        queryDefinitions: [
          {
            queryId: 'Company-Competitors',
            queryVariableName: 'competitor'
          }
        ],
      },
      aggs: [],
      listeners: {},
      version: 2
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'data-table-2-fu'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"filter":[]}'
    },
    savedSearchId: 'Companies',
    title: 'Companies Table',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Companies Table',
      type: 'kibi-data-table',
      params: {
        clickOptions: [
          {
            columnField: 'label',
            targetDashboardId: '',
            type: 'select'
          }
        ],
        columns: ['Why Relevant?'],
        enableQueryFields: true,
        hasEntityDependentQuery: true,
        joinElasticsearchField: 'label-not-analyzed',
        queryFieldName: 'Why Relevant?',
        queryDefinitions: [
          {
            queryId: 'Company-Competitors',
            queryVariableName: 'competitor'
          }
        ],
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'query-viewer-1'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":[]}'
    },
    title: 'Company Info',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Company Info',
      type: 'kibiqueryviewervis',
      params: {
        queryOptions: [
          {
            open: false,
            templateVars: {
              label: 'Info'
            },
            templateId: 'kibi-table-jade',
            queryId: 'Company-Info',
            _label: 'Info',
            isEntityDependent: true
          },
        ],
        hasEntityDependentQuery: true
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'query-viewer-1-np'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":[]}'
    },
    title: 'Company Info',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Company Info',
      type: 'kibiqueryviewervis',
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'query-viewer-1-nq'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":[]}'
    },
    title: 'Company Info',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Company Info',
      type: 'kibiqueryviewervis',
      params: {
        hasEntityDependentQuery: true
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'query-viewer-2'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":[]}'
    },
    title: 'Company Info',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Company Info',
      type: 'kibiqueryviewervis',
      params: {
        queryDefinitions: [
          {
            open: false,
            templateVars: {
              label: 'Info'
            },
            templateId: 'kibi-table-jade',
            queryId: 'Company-Info',
            _label: 'Info'
          },
        ]
      },
      aggs: [],
      listeners: {},
      version: 2
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'query-viewer-2-fu'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":[]}'
    },
    title: 'Company Info',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify({
      title: 'Company Info',
      type: 'kibiqueryviewervis',
      params: {
        queryDefinitions: [
          {
            open: false,
            templateVars: {
              label: 'Info'
            },
            templateId: 'kibi-table-jade',
            queryId: 'Company-Info',
            _label: 'Info'
          },
        ]
      },
      aggs: [],
      listeners: {}
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'query-2'
    }
  },
  {
    activation_rules: '[]',
    description: 'Top 50 companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_status_code: 200,
    activationQuery: '',
    datasourceId: 'sql-datasource',
    resultQuery: 'select id, label, employees from company order by employees desc limit 50',
    tags: [],
    title: 'Top 50 companies by number of employees',
    version: 2
  },
  {
    index: {
      _index: '.kibi',
      _type: 'template',
      _id: 'kibi-table-jade-2'
    }
  },
  {
    description: 'Another Jade template.',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    templateEngine: 'jade',
    templateSource: '//- Another jade generic table template example',
    title: 'template-2',
    version: 2
  }
];
