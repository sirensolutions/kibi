import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import uiRoutes from 'ui/routes';
import _ from 'lodash';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants } from './dashboard_constants';

// kibi: imports
import 'ui/kibi/directives/kibi_select'; // added as it is needed by src/plugins/kibana/public/dashboard/partials/save_dashboard.html
import 'ui/kibi/session/siren_session'; // added to make sirenSession service available
import 'ui/filter_bar/join_explanation'; // provides explanations of queries and filters to tooltips
// kibi: end

savedObjectRegistry.register(savedDashboardRegister);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  // kibi: redirect to landing page by default
  .when('/dashboard/', {
    redirectTo: DashboardConstants.LANDING_PAGE_PATH
  })
  // kibi: end
  // kibi: separate listing and landing routes
  .when(DashboardConstants.LISTING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController',
    // kibi: handle default dashboard
    resolve: {
      default: function (savedDashboards, Promise, kbnUrl, createNotifier, config) {
        // kibi: here we handle the default dashboard title
        // - get all the dashboards
        // - if none, just create a new one
        // - if any try to load the default dashboard if set, otherwise load the first dashboard
        // - if the default dashboard is missing, load the first dashboard
        // - if the first dashboard is missing, create a new one
        let getDefaultDashboard = Promise.resolve({ hits: [] });
        const notify = createNotifier();

        const defDashConfig = config.get('kibi:defaultDashboardTitle');

        if (defDashConfig) {
          getDefaultDashboard = savedDashboards.find(defDashConfig, 1);
        }

        return Promise.all([
          savedDashboards.find('', 1),
          getDefaultDashboard
        ])
        .then(([
            { total: totalFirst, hits: [ firstDashboard ] },
            { total: totalDefault, hits: dashboards }
          ]) => {
          if (!totalFirst) {
            return savedDashboards.get();
          }
          // select the first dashboard if default_dashboard_title is not set or does not exist
          let dashboardId = firstDashboard.id;
          if (totalDefault === 0) {
            notify.error(`The default dashboard with title "${defDashConfig}" does not exist.
            Please correct the "kibi_core.default_dashboard_title" parameter in advanced settings`);
          } else if (totalDefault > 0) {
            const dashboardIndex = _.findIndex(dashboards, function (dashboard) { return dashboard.title ===  defDashConfig; });
            dashboardId = dashboards[dashboardIndex].id;
          }
          kbnUrl.redirect(`/dashboard/${dashboardId}`);
          return Promise.halt();
        })
        .catch(notify.error);
      }
    }
  });
  // kibi: end
