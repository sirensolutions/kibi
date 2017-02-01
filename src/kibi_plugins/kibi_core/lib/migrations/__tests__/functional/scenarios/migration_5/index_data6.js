import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a kibi relational filter visualization with version 1
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: packageJson.kibi_version
    }
  },
  {
    buildNum: packageJson.build.number,
    'dateFormat:tz': 'UTC',
    'kibi:relations': JSON.stringify({
      relationsIndices: [
        {
          id: 'art*//companies/comp*//id',
          indices: [
            {
              indexPatternId: 'art*',
              indexPatternType: '',
              path: 'companies'
            },
            {
              indexPatternId: 'comp*',
              indexPatternType: '',
              path: 'id'
            }
          ],
          label: 'mentions'
        }
      ],
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
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies',
            sourceIndexPatternId: 'art*',
            sourceIndexPatternType: '',
            targetField: 'id',
            targetIndexPatternId: 'comp*',
            targetIndexPatternType: ''
          }
        ]
      },
      aggs: [],
      listeners: {}
    }),
    uiStateJSON: '{}',
    description: '',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\"filter\":[],\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}'
    }
  }
];
