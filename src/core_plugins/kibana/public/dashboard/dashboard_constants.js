import { encodeQueryComponent } from '../../../../utils';

export const DashboardConstants = {
  ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM: 'addToDashboard',
  NEW_VISUALIZATION_ID_PARAM: 'addVisualization',
  LANDING_PAGE_PATH: '/dashboards', // kibi: separate landing and listing
  LISTING_PAGE_PATH: '/dashboards-listing',
  // kibi: changed from '/dashboard' because now there's a specific path for dashboard creation
  // the reason is to allow for a default dashboard to be loaded
  CREATE_NEW_DASHBOARD_URL: '/dashboard/new-dashboard/create',
};

export function createDashboardEditUrl(id) {
  return `/dashboard/${encodeQueryComponent(id)}`;
}
