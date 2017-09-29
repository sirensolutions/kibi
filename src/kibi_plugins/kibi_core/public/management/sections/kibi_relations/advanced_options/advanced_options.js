import _ from 'lodash';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './advanced_options.html';

uiRoutes.when('/management/siren/relations/:id', {
  template
});

uiModules
.get('apps/management')
.controller('RelationAdvancedSettingsController', function ($scope, $routeParams, config, kbnUrl, createNotifier) {
  const notify = createNotifier({
    name: 'Relation Advanced Settings'
  });

  const relations = config.get('kibi:relations');

  $scope.joinTypes = [
    {
      value: 'INNER_JOIN',
      label: 'distributed join'
    },
    {
      value: 'SEARCH_JOIN',
      label: 'broadcast join'
    }
  ];

  $scope.relation = relations.relationsIndices[$routeParams.id];
  if (!$scope.relation.type) {
    $scope.relation.type = 'SEARCH_JOIN'; // default join type
  }

  if (!$scope.relation.limit) {
    $scope.relation.limit = -1; // -1 to take the global one from kibi:joinLimit
  }

  // cancel button
  $scope.cancel = function () {
    kbnUrl.change('/management/siren/relations');
  };

  // save button
  $scope.submit = function () {
    config.set('kibi:relations', relations)
    .then(() => {
      kbnUrl.change('/management/siren/relations');
    });
  };
});
