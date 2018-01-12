import _ from 'lodash';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './advanced_options.html';

uiRoutes.when('/management/siren/relations/:entity/:relId', {
  template
});

uiModules
.get('apps/management')
.controller('RelationAdvancedSettingsController', function ($scope, $routeParams, config, kbnUrl, createNotifier, ontologyClient) {
  const notify = createNotifier({
    name: 'Relation Advanced Settings'
  });

  $scope.joinTypes = [
    {
      value: 'MERGE_JOIN',
      label: 'Distributed join using merge join algorithm'
    },
    {
      value: 'HASH_JOIN',
      label: 'Distributed join using hash join algorithm'
    },
    {
      value: 'BROADCAST_JOIN',
      label: 'Broadcast join'
    }
  ];

  ontologyClient.getRelations()
  .then((relations) => {
    const relId = decodeURIComponent($routeParams.relId);
    $scope.relation = _.find(relations, (rel) => { return rel.id === relId; });

    // check if the limit property is present
    if (typeof $scope.relation.timeout === 'undefined') {
      const defaultTimeout = config.get('siren:joinTaskTimeout');
      if (defaultTimeout === 0) {
        $scope.relation.timeout = -1; // -1 to take the global one from kibi:joinTaskTimeout
      } else {
        $scope.relation.timeout = defaultTimeout;
      }
    }

    // cancel button
    $scope.cancel = function () {
      kbnUrl.change('/management/siren/entities/' + $routeParams.entity);
    };

    // save button
    $scope.submit = function () {
      if (!$scope.relation.joinType || $scope.relation.joinType === '') {
        delete $scope.relation.joinType;
      }
      ontologyClient.insertRelations([$scope.relation])
      .then(() => {
        kbnUrl.change('/management/siren/entities/' + $routeParams.entity);
      });
    };
  });
});
