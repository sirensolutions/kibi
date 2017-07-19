define(function (require) {

  var _ = require('lodash');

  return function DeleteHelperFactory(savedVisualizations, Private, $window, config) {

    function DeleteHelper() {
    }

    var dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));

    /**
     * GetVisualisations returns visualisations that are used by the list of queries
     */
    DeleteHelper.prototype._getVisualisations = function (queryIds) {
      if (!queryIds) {
        return Promise.reject(new Error('Empty argument'));
      }
      return savedVisualizations.find('').then(function (resp) {
        var selectedQueries = [];

        var queryIds2 = _.map(queryIds, function (id) {
          return '"queryId":"' + id + '"';
        });
        var vis = _.filter(resp.hits, function (hit) {
          var list = _.filter(queryIds2, function (id, index) {
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
          const defaultDashboard = config.get('kibi:defaultDashboardTitle');
          return dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(ids)
          .then(function (dashboardGroupNames) {
            if (dashboardGroupNames && dashboardGroupNames.length > 0) {
              var plural = dashboardGroupNames.length > 1;
              var msg =
                'Dashboard ' + JSON.stringify(ids, null, ' ') + ' is referred by the following dashboardGroup' +
                (plural ? 's' : '') + ':\n' + dashboardGroupNames.join(', ') + '\n' +
                'Please edit the group' + (plural ? 's' : '') +
                ' and remove the dashboard from its configuration first.';
              $window.alert(msg);
              return;
            } else {
              //kibi: if default dashboard is removed, remove it also from config
              _.each(ids, function (dashboardId) {
                if (defaultDashboard === dashboardId) {
                  config.set('kibi:defaultDashboardTitle', '');
                }
              });
              if (delcb) {
                delcb();
              }
            }
          });

        case 'query':
          return this._getVisualisations(ids).then(function (visData) {
            if (visData[0].length) {
              var plural = visData[0].length > 1;
              var msg = plural ? 'The queries ' : 'The query ';
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

});
