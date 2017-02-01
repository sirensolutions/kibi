import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a configuration with a kibi:relations of version 2
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
          id: 'article//companies/company//id',
          indices: [
            {
              indexPatternId: 'article',
              indexPatternType: '',
              path: 'companies'
            },
            {
              indexPatternId: 'company',
              indexPatternType: '',
              path: 'id'
            }
          ],
          label: 'mentions'
        },
        {
          id: 'article//companies/onetype//one',
          indices: [
            {
              indexPatternId: 'article',
              indexPatternType: '',
              path: 'companies'
            },
            {
              indexPatternId: 'ontype',
              indexPatternType: '',
              path: 'one'
            }
          ],
          label: 'mentions'
        },
        {
          id: 'company//id/onetype//one',
          indices: [
            {
              indexPatternId: 'onetype',
              indexPatternType: '',
              path: 'one'
            },
            {
              indexPatternId: 'company',
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
            label: 'to Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article1',
            targetField: 'id',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company1'
          },
          {
            filterLabel: '',
            label: 'to Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'one',
            sourceIndexPatternId: 'onetype',
            sourceIndexPatternType: '',
            targetField: 'id',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company1'
          },
          {
            filterLabel: '',
            label: 'to Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article1',
            targetField: 'one',
            targetIndexPatternId: 'onetype',
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
