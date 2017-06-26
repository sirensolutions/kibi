import { DashboardViewMode } from './dashboard_view_mode';
import _ from 'lodash';
import $ from 'jquery';

/**
 * @param list {Array.<string>}
 * @returns {string} The list of strings concatenated with commas so it can be used in a message.
 * E.g. ['a', 'b', 'c'] returns 'a, b, and c'.
 */
export function createStringList(list) {
  const listClone = _.clone(list);
  const isPlural = list.length > 1;
  const lastEntry = isPlural ? `, and ${list[list.length - 1]}` : '';
  if (isPlural) listClone.splice(-1, 1);

  return `${listClone.join(', ')}${lastEntry}`;
}

/**
 * @param changedFilters {Array.<string>} An optional list of filter types that have changed.
 * @returns {string} A warning message to display to the user that they are going to lose changes.
 */
export function getUnsavedChangesWarningMessage(changedFilters) {
  const changedFilterList = createStringList(changedFilters);

  return changedFilterList ?
    `Are you sure you want to cancel and lose changes, including changes made to your ${changedFilterList}?` :
    `Are you sure you want to cancel and lose changes?`;
}

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @param isDirty {boolean} if the dashboard is in a dirty state. If in dirty state, adds (unsaved) to the
 * end of the title.
 * @param maxLength {integer} the maximum number of characters to show for a name.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(title, viewMode, isDirty, maxLength) {
  if (maxLength !== undefined && title.length > maxLength) {
    title = title.substring(0, maxLength) + '...';
  }

  const isEditMode = viewMode === DashboardViewMode.EDIT;
  const unsavedSuffix = isEditMode && isDirty
    ? ' (unsaved)'
    : '';

  const displayTitle = `${title}${unsavedSuffix}`;
  return isEditMode ? 'Editing ' + displayTitle : displayTitle;
}

/**
 * Kibi: function that calculates the max characters to display for a dashboard title depending on the window size
 * and the other UI elements width.
 * Returns an integer of 0 or more.
 */
export function getDashBoardTitleMaxLength() {
  let globalNavWidth = 0;
  let dashboardsNavWidth = 0;
  let kuiLocalMenuWidth = 0;
  let kuiLocalBreadcrumbLinkWidth = 0;
  const globalNavElmt = document.getElementById('kibi-global-nav');
  if (globalNavElmt) {
    globalNavWidth = globalNavElmt.clientWidth;
  }
  const dashboardsNavElmt = document.getElementById('kibi-dashboards-nav');
  if (dashboardsNavElmt) {
    dashboardsNavWidth = dashboardsNavElmt.clientWidth;
  }
  const kuiLocalMenuElmt = document.getElementById('kibi-kuiLocalMenu');
  if (kuiLocalMenuElmt) {
    kuiLocalMenuWidth = kuiLocalMenuElmt.clientWidth;
  }
  const kuiLocalBreadcrumbLinElmt = document.getElementById('kibi-kuiLocalBreadcrumb');
  if (kuiLocalBreadcrumbLinElmt) {
    kuiLocalBreadcrumbLinkWidth = kuiLocalBreadcrumbLinElmt.offsetWidth;
  }
  // shift is composed from the sum of paddings and a reserved space for the documents count
  const shift = 30 + 115;

  const titleSpace = $(window).width() - globalNavWidth - dashboardsNavWidth - kuiLocalMenuWidth
    - kuiLocalBreadcrumbLinkWidth - shift;

  if (titleSpace <= 0) {
    return 0;
  } else {
    return Math.floor(titleSpace / 9);
  }
}
