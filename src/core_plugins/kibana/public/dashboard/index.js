import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import uiRoutes from 'ui/routes';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants } from './dashboard_constants';

// kibi: imports
import 'ui/kibi/directives/kibi_select'; // added as it is needed by src/plugins/kibana/public/dashboard/partials/save_dashboard.html
import 'ui/kibi/session/siren_session'; // added to make sirenSession service available
import 'ui/filter_bar/join_explanation'; // provides explanations of queries and filters to tooltips
// kibi: end

require('ui/saved_objects/saved_object_registry').register(savedDashboardRegister);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  });
