
import _ from 'lodash';


// Consts

const gridWidth = 12;
const maxPanelsPerRow = 3;

const typeDefaults = _.indexBy([{
  type: 'pie',
  priority: 1,                      // See PanelSpecs for descriptions
  minWidth: 3,
  minHeight: 2,
  grow: 1
}, {
  type: 'table',
  priority: 1,
  minWidth: 3,
  minHeight: 3,
  grow: 0
}, {
  type: 'tagcloud',
  priority: 1,
  minWidth: 3,
  minHeight: 3,
  grow: 1
}, {
  type: 'histogram',                // Vertical bars
  priority: 1,
  minWidth: 6,
  minHeight: 3,
  grow: 2
}, {
  type: 'line',                     // Currently used as timeline (datetimes)
  priority: 2,
  minWidth: 9,
  minHeight: 3,
  grow: 2
}, {
  type: 'tile_map',                 // Coordinate map (geo points)
  priority: 3,
  minWidth: 9,
  minHeight: 3,
  grow: 2
}, {
  type: 'kibi-data-table',          // Kibi Data Table (search results)
  priority: 0,
  minWidth: 6,
  minHeight: 3,
  grow: 1
}, {
  type: 'kibi_multi_chart_vis',     // Multichart (jolly vis)
  priority: 0,
  minWidth: 6,
  minHeight: 3,
  grow: 1
}], 'type');


// Local Functions

function applyDefaults(panelSpecs) {
  return panelSpecs.map(ps => _.defaults(ps, typeDefaults[ps.type] || {}));
}

function sanitizeValues(panelSpecs) {
  panelSpecs.forEach(ps => {
    ps.priority  = Math.max(0, ps.priority);
    ps.minWidth  = Math.max(1, ps.minWidth);
    ps.minHeight = Math.max(1, ps.minHeight);
    ps.grow      = Math.max(0, ps.grow);
  });

  return panelSpecs;
}

function storeIndex(panelSpecs) {
  panelSpecs.forEach((ps, index) => ps.index = index);
  return panelSpecs;
}

function sortByPriority(panelSpecs) {
  // Sort panels by type priority. Types with the same priority will
  // be interleaved.

  let result = [];

  const panelsByPriority = _.groupBy(panelSpecs, 'priority');
  const priorities = _(panelSpecs)
    .map('priority')
    .sortBy()
    .uniq(true)
    .reverse()
    .value();

  priorities.forEach(pri => {
    const priGroup = panelsByPriority[pri];

    const panelsByType = _(priGroup)
      .groupBy('type')
      .values()
      .value();

    result = _.zip(...panelsByType).reduce(
      (panels, zipped) => panels.concat(_.compact(zipped)),
      result);
  });

  return result;
}

function makeRows(panelSpecs) {
  // Fill rows of panels until either the grid width or panels per row are reached

  const rows = [[]];

  let currRow = rows[0];
  let currWidth = 0;

  panelSpecs.forEach(function addPanel(ps) {
    const minWidth = ps.minWidth;

    if(currWidth + minWidth > gridWidth || currRow.length >= maxPanelsPerRow) {
      // New row
      currWidth = 0;
      currRow = [];

      rows.push(currRow);
    }

    // Add panel to row
    currRow.push(ps);
    currWidth += minWidth;
  });

  return rows;
}

function applyRowLayout(row) {
  // Distribute free space in the row, and assign horizontal geometry

  // Calculate free space and growth factors
  const freeSpace = gridWidth - _.sum(row, 'minWidth');
  let totalGrow = _.sum(row, 'grow');

  if(totalGrow === 0) {
    row.forEach(ps => ps.grow = 1);
    totalGrow = row.length;
  }

  // Assign geometry, values rounded to integer
  let x = 0;

  row.forEach(ps => {
    const width = ps.minWidth + freeSpace * ps.grow / totalGrow;

    ps.x = Math.round(x);
    x += width;

    ps.width = Math.round(x) - ps.x;
  });

  if(row.length) {
    // Rounding errors are applied to the last panel
    const last = row[row.length - 1];
    last.width = gridWidth - last.x;
  }

  return row;
}

function applyMainLayout(rows) {
  return rows.map(applyRowLayout);
}

function applyCrossLayout(rows) {
  let y = 0;

  rows.forEach(row => {
    // Apply the maximum panel height in the row
    const height = _.max(row, 'minHeight').minHeight;

    row.forEach(ps => {
      ps.y = y;
      ps.height = height;
    });

    y += height;
  });

  return rows;
}

function extractGeometry(panelSpecs) {
  const geomKeys = ['index', 'x', 'y', 'width', 'height'];
  return _.map(panelSpecs, ps => _.pick(ps, geomKeys));
}


// Exports

/** @typedef {Object} PanelSpecs
 * @property {String} type          Visualzation type (pie, line, table, ...)
 * @property {Number} priority      Panel priority (higher gets inserted before)
 * @property {Number} minWidth      Minimum panel width
 * @property {Number} minHeight     Minimum panel height
 * @property {Number} grow          Weight used for distributing free space
 */

/** @typedef {Object} PanelGeometry
 * @property {Number} index         Row-wise index of the panel in the layout
 * @property {Number} x             X position
 * @property {Number} y             Y position
 * @property {Number} width         Panel width
 * @property {Number} height        Panel height
 */

/** @function panelsLayout
 *
 * @description
 * Calculates the layout to be used for a quick dashboard, given
 * the input panel specifications.
 *
 * Layout rules are the following:
 *  - Flexbox-like row layout
 *  - Higher priority panels are inserted before lower priority panels
 *  - Same priority panels are interleaved by panel type
 *
 * @param {PanelSpecs[]}   panelSpecs   Input panel specifications
 * @return {PanelGeometry[]}            List of panel geometries and order of appearance
 */
export const panelsLayout = _.flow(
  applyDefaults,
  sanitizeValues,
  storeIndex,
  sortByPriority,
  makeRows,
    applyMainLayout,
    applyCrossLayout,
  _.flatten,
  extractGeometry);

