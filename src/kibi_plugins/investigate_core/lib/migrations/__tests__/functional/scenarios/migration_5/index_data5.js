/**
 * Defines the following objects:
 *
 * - a configuration with a kibi:relations of version 2
 * - a kibi relational filter visualization with version 2
 * - a visualization of version 1 other that the kibi relational filter
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    buildNum: '123',
    'dateFormat:tz': 'UTC',
    'kibi:relations': JSON.stringify({
      relationsIndices: [],
      relationsDashboards: [],
      relationsDashboardsSerialized: {},
      relationsIndicesSerialized: {},
      version: 2
    })
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'buttons'
    }
  },
  {
    title: 'buttons',
    visState: JSON.stringify({
      title: 'buttons',
      type: 'kibi_sequential_join_vis',
      params: {
        buttons: [
          {
            filterLabel: '',
            label: 'to Companies',
            targetDashboardId: 'Companies',
            indexRelationId: 'article//companies/company//id'
          }
        ]
      },
      aggs: [],
      listeners: {},
      version: 2
    }),
    uiStateJSON: '{}',
    description: '',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\"filter\":[],\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}'
    }
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'sql'
    }
  },
  {
    title: 'sql',
    visState: JSON.stringify({
      title: 'sql',
      type: 'kibi-data-table',
      params: {
        clickOptions: [],
        queryDefinitions: []
      },
      aggs: [],
      listeners: {},
      version: 1
    }),
    uiStateJSON: '{}',
    description: '',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\"filter\":[],\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}'
    }
  }
];
