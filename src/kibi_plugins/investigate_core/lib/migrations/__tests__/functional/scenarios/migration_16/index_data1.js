/* eslint max-len:0 */

/**
 * Defines the following objects:
 *
 * - a kibi scatterplot visualization which should be upgraded
 * - a kibi scatterplot visualization which should NOT be upgraded
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'scatterplot-to-upgrade'
    }
  },
  {
    description : '',
    kibanaSavedObjectMeta : {},
    title : 'Scatterplot1',
    uiStateJSON : '{}',
    version : 1,
    visState : '{"title":"Scatterplot1","type":"kibi_scatterplot_vis"}'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'scatterplot-to-not-upgrade'
    }
  },
  {
    description : '',
    kibanaSavedObjectMeta : {},
    title : 'Scatterplot2',
    uiStateJSON : '{}',
    version : 1,
    visState : '{"title":"Scatterplot2","type":"scatterplot_vis"}'
  }
];
