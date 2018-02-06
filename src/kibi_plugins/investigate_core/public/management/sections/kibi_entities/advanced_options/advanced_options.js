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
      value: null,
      label: 'Automatic'
    },
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
    $scope.relation = _.find(relations, rel => rel.id === relId);
    $scope.inverseRelation = _.find(relations, rel => rel.id === $scope.relation.inverseOf);

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
      kbnUrl.change('/management/siren/indexesandrelations/' + $routeParams.entity + '/relations');
    };

    // save button
    $scope.submit = function () {
      // note: if we plan to allow the user to have different parameter in the direct and
      // inverse relation, we need switch to a "deleteRelationsById" + "insertRelations(false)"
      // that does not automatically add the inverse. Both the API are not yet implemented.
      $scope.inverseRelation.joinType = $scope.relation.joinType;
      $scope.inverseRelation.timeout = $scope.relation.timeout;
      if (!$scope.relation.joinType || $scope.relation.joinType === '') {
        delete $scope.relation.joinType;
        delete $scope.inverseRelation.joinType;
      }

      ontologyClient.insertRelations([$scope.relation, $scope.inverseRelation])
      .then(() => {
        $scope.relation.joinType = $scope.relation.joinType ? $scope.relation.joinType : null;
        notify.info(`Advanced settings for the ${$scope.relation.directLabel} relation successfuly updated`);
        kbnUrl.change('/management/siren/indexesandrelations/' + $routeParams.entity + '/relations');
      })
      .catch(notify.error);
    };
  });
});
