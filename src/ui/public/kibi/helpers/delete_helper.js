import _ from 'lodash';

export default function DeleteHelperFactory(Promise, dashboardGroups, savedVisualizations, Private, $window, config) {

  function DeleteHelper() {
  }

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
    if (!delcb) {
      throw new Error('delete method was not passed');
    }

    const _delete = function () {
      let promise = delcb();
      if (!Promise.is(promise)) {
        promise = Promise.resolve();
      }
      return promise;
    };

    switch (type) {
      case 'dashboardgroup':
        return _delete().then(() => dashboardGroups.computeGroups(`deleted dashboard groups ${JSON.stringify(ids, null, ' ')}`));

      case 'dashboard':
        const dashboardGroupNames = dashboardGroups.getIdsOfDashboardGroupsTheseDashboardsBelongTo(ids);
        const defaultDashboard = config.get('kibi:defaultDashboardId');
        if (dashboardGroupNames && dashboardGroupNames.length > 0) {
          const plural = dashboardGroupNames.length > 1;
          const msg =
            'Dashboard ' + JSON.stringify(ids, null, ' ') + ' is referred by the following dashboardGroup' +
            (plural ? 's' : '') + ':\n' + dashboardGroupNames.join(', ') + '\n' +
            'Please edit the group' + (plural ? 's' : '') +
            ' and remove the dashboard from its configuration first.';
          $window.alert(msg);
          return Promise.resolve();
        }
        //kibi: if default dashboard is removed, remove it also from config
        _.each(ids, function (dashboardId) {
          if(defaultDashboard === dashboardId) {
            config.set('kibi:defaultDashboardId', '');
          }
        });
        return _delete().then(() => dashboardGroups.computeGroups(`deleted dashboards ${JSON.stringify(ids, null, ' ')}`));

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
            delcb();
          }
        });

      default:
        return _delete();
    }
  };

  return new DeleteHelper();
};
