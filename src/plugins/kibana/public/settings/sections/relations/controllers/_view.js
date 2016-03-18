/*global define*/
define(function (require) {

  var _ = require('lodash');

  // path to view template
  var relAdvViewHTML = require('plugins/kibana/settings/sections/relations/_view.html');
  require('ui/routes').when('/settings/relations/:service/:id', {
    template: relAdvViewHTML
  });

  var app = require('ui/modules').get('apps/settings', ['kibana']);

  // relation edit button controller
  app.controller('RelationsAdvancedController', function (
    $scope, $routeParams, config, kbnUrl) {

    $scope.relations = config.get('kibi:relations');

    // default values
    var defValues = {orderBy: 'default', maxTermsPerShard: 'all terms', termsEncoding: 'bloom'};

    // lists of values to display
    $scope.values = {
      orderByValues: ['default', 'doc_score'],
      termsEncodingValues: ['long', 'integer', 'bloom']
    };

    // set default object properties
    if ($routeParams.service === 'indices') {
      $scope.relationService = $scope.relations.relationsIndices[$routeParams.id][$routeParams.service];

      for (var i = 0; i <= 1; i++) {
        if (typeof $scope.relationService[i] === 'object' && $scope.relationService[i] !== null) {
          for (var key in defValues) {
            if (defValues.hasOwnProperty(key)) {
              if (!$scope.relationService[i][key] || $scope.relationService[i][key] === 'undefined') {
                $scope.relationService[i][key] = defValues[key];
              }
            }
          }
        }
      }
    }

    // cancel buttono
    $scope.cancel = function () {
      kbnUrl.change('/settings/relations');
    };

    // save button
    $scope.submit = function () {
      // make sure maxTermsPerShard is either "all terms" or a number
      // if it is a number it should NOT be stored as string
      _.each($scope.relationService, function (relationEl) {
        if (relationEl.maxTermsPerShard && relationEl.maxTermsPerShard !== defValues.maxTermsPerShard) {
          relationEl.maxTermsPerShard = Number(relationEl.maxTermsPerShard);
        }
      });
      config.set('kibi:relations', $scope.relations);
      kbnUrl.change('/settings/relations');
    };

  });
});
