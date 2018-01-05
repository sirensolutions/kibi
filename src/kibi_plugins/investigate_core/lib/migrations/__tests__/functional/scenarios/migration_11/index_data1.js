/**
 * Defines the following objects:
 *
 * - a heatmap visualization created in kibi 4
 * - a heatmap visualization created in kibi 5
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'heatmap4'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'company',
          query: {
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          },
          filter: []
        }
      )
    },
    title: 'heatmap4',
    uiStateJSON: JSON.stringify(
      {
        a: 123
      }
    ),
    version: 1,
    visState: JSON.stringify(
      {
        title: 'New Visualization',
        type: 'heatmap',
        params: {
          margin: {
            top: 20,
            right: 200,
            bottom: 100,
            left: 100
          },
          stroke: '#ffffff',
          strokeWidth: 1,
          padding: 0,
          legendNumberFormat: 'number',
          color: 'YlGn',
          numberOfColors: 6,
          rowAxis: {
            filterBy: 0,
            title: 'category_code: Descending'
          },
          columnAxis: {
            filterBy: 0,
            title: 'countrycode: Descending'
          },
          legendTitle: 'Count'
        },
        aggs: [
          {
            id: '1',
            type: 'count',
            schema: 'metric',
            params: {}
          },
          {
            id: '2',
            type: 'terms',
            schema: 'columns',
            params: {
              field: 'countrycode',
              size: 10,
              order: 'desc',
              orderBy: '1'
            }
          },
          {
            id: '3',
            type: 'terms',
            schema: 'rows',
            params: {
              field: 'category_code',
              size: 5,
              order: 'desc',
              orderBy: '1'
            }
          }
        ],
        listeners: {},
        kibiSettings: {}
      }
    )
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'heatmap5'
    }
  },
  {
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'company',
          query: {
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          },
          filter: []
        }
      )
    },
    savedSearchId: 'Articles',
    title: 'heatmap5',
    uiStateJSON: '{}',
    version: 1,
    visState: JSON.stringify(
      {
        title: 'kibi5 - test heatmap',
        type: 'heatmap',
        params: {
          addTooltip: true,
          addLegend: true,
          enableHover: false,
          legendPosition: 'right',
          times: [],
          colorsNumber: 4,
          colorSchema: 'Greens',
          setColorRange: false,
          colorsRange: [],
          invertColors: false,
          percentageMode: false,
          valueAxes: [
            {
              show: false,
              id: 'ValueAxis-1',
              type: 'value',
              scale: {
                type: 'linear',
                defaultYExtents: false
              },
              labels: {
                show: false,
                rotate: 0,
                color: '#555'
              }
            }
          ]
        },
        aggs: [
          {
            id: '1',
            enabled: true,
            type: 'count',
            schema: 'metric',
            params: {}
          },
          {
            id: '2',
            enabled: true,
            type: 'terms',
            schema: 'segment',
            params: {
              field: 'countrycode.raw',
              size: 10,
              order: 'desc',
              orderBy: '1'
            }
          },
          {
            id: '3',
            enabled: true,
            type: 'terms',
            schema: 'group',
            params: {
              field: 'category_code.raw',
              size: 5,
              order: 'desc',
              orderBy: '1'
            }
          }
        ],
        listeners: {},
        kibiSettings: {}
      }
    )
  }
];
