import DashboardGroupHelperProvider from 'ui/kibi/helpers/dashboard_group_helper';
import _ from 'lodash';

export default function DeleteHelperFactory(savedVisualizations, Private, $window) {

  function DeleteHelper() {
  }

  const dashboardGroupHelper = Private(DashboardGroupHelperProvider);

  /**
   * GetVisualisations returns visualisations that are used by the list of queries
   */
  DeleteHelper.prototype._getVisualisations = function (queryIds) {
    if (!queryIds) {
      return Promise.reject(new Error('Empty argument'));
    }
    return savedVisualizations.find('').then(function (resp) {
      const selectedQueries = [];

      const queryIds2 = _.map(queryIds, function (id) {
        return '"queryId":"' + id + '"';
      });
      const vis = _.filter(resp.hits, function (hit) {
        const list = _.filter(queryIds2, function (id, index) {
          if (hit.visState.indexOf(id) !== -1) {
            selectedQueries.push(queryIds[index]);
            return true;
          }
          return false;
        });
        return !!list.length;
      });
      return [ _(selectedQueries).compact().unique().value(), vis ];
    });
  };

  /**
   * Delete selected objects with pre-processing that depends on the type of the service
   */
  DeleteHelper.prototype.deleteByType = function (type, ids, delcb) {
    switch (type) {
      case 'dashboard':
        return dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(ids)
        .then(function (dashboardGroupNames) {
          if (dashboardGroupNames && dashboardGroupNames.length > 0) {
            const plural = dashboardGroupNames.length > 1;
            const msg =
              'Dashboard ' + JSON.stringify(ids, null, ' ') + ' is referred by the following dashboardGroup' +
              (plural ? 's' : '') + ':\n' + dashboardGroupNames.join(', ') + '\n' +
              'Please edit the group' + (plural ? 's' : '') +
              ' and remove the dashboard from its configuration first.';
            $window.alert(msg);
            return;
          } else {
            if (delcb) {
              delcb();
            }
          }
        });

      case 'query':
        return this._getVisualisations(ids).then(function (visData) {
          if (visData[0].length) {
            const plural = visData[0].length > 1;
            let msg = plural ? 'The queries ' : 'The query ';
            msg += JSON.stringify(visData[0], null, ' ') + (plural ? ' are' : ' is') + ' used in the following';
            msg += (visData[1].length === 1 ? ' visualization' : ' visualizations') + ': \n' +
              JSON.stringify(_.pluck(visData[1], 'title'), null, ' ') + '\n\nPlease edit or delete' +
              (visData[1].length === 1 ? ' this visualization ' : ' those visualizations ') + 'first.\n\n';
            $window.alert(msg);
          } else {
            if (delcb) {
              delcb();
            }
          }
        });

      default:
        if (delcb) {
          delcb();
        }
    }
  };

  return new DeleteHelper();
};
