define(function (require) {

  var _ = require('lodash');

  return function DeleteHelperFactory(Private, $window) {

    function DeleteHelper() {
    }

    var dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
    var queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));

    /**
     * Delete selected objects with pre-processing that depends on the type of the service
     */
    DeleteHelper.prototype.deleteByType = function (type, ids, delcb) {
      switch (type) {
        case 'dashboard':
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
              if (delcb) {
                delcb();
              }
            }
          });

        case 'query':
          return queryHelper.getVisualisations(ids).then(function (visData) {
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
