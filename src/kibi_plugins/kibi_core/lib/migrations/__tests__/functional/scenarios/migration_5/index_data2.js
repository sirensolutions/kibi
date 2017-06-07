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
      _id: 'kibi'
    }
  },
  {
    buildNum: '123',
    'dateFormat:tz': 'UTC',
    'kibi:relations': JSON.stringify({
      relationsIndices: [
        {
          id: 'article/Article/companies1/company/Company/id1',
          indices: [
            { indexPatternId: 'article', indexPatternType: 'Article', path: 'companies1' },
            { indexPatternId: 'company', indexPatternType: 'Company', path: 'id1' }
          ],
          label: 'mentions'
        },
        {
          id: 'article/Article/companies2/company//id2',
          indices: [
            { indexPatternId: 'article', indexPatternType: 'Article', path: 'companies2' },
            { indexPatternId: 'company', indexPatternType: '', path: 'id2' }
          ],
          label: 'mentions'
        },
        {
          id: 'article//companies3/company/Company/id3',
          indices: [
            { indexPatternId: 'article', indexPatternType: '', path: 'companies3' },
            { indexPatternId: 'company', indexPatternType: 'Company', path: 'id3' }
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
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: '',
            sourceField: 'companies1',
            targetIndexPatternId: 'company',
            targetIndexPatternType: '',
            targetField: 'id1'
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article',
            sourceField: 'companies1',
            targetIndexPatternId: 'company',
            targetIndexPatternType: '',
            targetField: 'id1'
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: '',
            sourceField: 'companies1',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company',
            targetField: 'id1'
          },

          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies2',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: '',
            targetField: 'id2',
            targetIndexPatternId: 'company',
            targetIndexPatternType: ''
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies2',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: '',
            targetField: 'id2',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company'
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies2',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article',
            targetField: 'id2',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company'
          },

          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies3',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: '',
            targetField: 'id3',
            targetIndexPatternId: 'company',
            targetIndexPatternType: ''
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies3',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article',
            targetField: 'id3',
            targetIndexPatternId: 'company',
            targetIndexPatternType: ''
          },
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies3',
            sourceIndexPatternId: 'article',
            sourceIndexPatternType: 'Article',
            targetField: 'id3',
            targetIndexPatternId: 'company',
            targetIndexPatternType: 'Company'
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
