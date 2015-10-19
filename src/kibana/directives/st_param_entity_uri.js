define(function (require) {

  require('css!directives/st_param_entity_uri.css');

  require('modules')
    .get('kibana')
    .directive('stParamEntityUri', function ($http, Notifier) {

      var notify = new Notifier({
        location: 'Selected Entity'
      });

      return {
        restrict: 'E',
        replace: true,
        scope: {
          entityUriHolder: '=',
          datasourceType: '='
        },
        template: require('text!directives/st_param_entity_uri.html'),
        link: function ($scope, $el) {
          $scope.c = {
            index: '',
            type: '',
            id: '',
            column: '',
            extraItems: []
          };

          $scope.$watch('entityUriHolder', function () {
            if ($scope.entityUriHolder && $scope.entityUriHolder.entityURI) {
              var parts = $scope.entityUriHolder.entityURI.split('/');
              if (parts[0].indexOf('*') !== -1) {
                $scope.c.index  = parts[0];
              }
              $scope.c.type   = parts[1];
              $scope.c.id     = parts[2];
              if (parts.length >= 4) {
                $scope.c.column = parts[3];
              }
              if ($scope.c.id) {
                $scope.c.extraItems = [{
                  label: $scope.c.id,
                  value: $scope.c.id
                }];
              }
            }
          }, true);


          $scope.$watchMulti(['c.index', 'c.type', 'c.id', 'c.column'], function () {
            if ($scope.c.index && $scope.c.type && $scope.c.id) {

              if ($scope.c.index.indexOf('*') !== -1) {
                // user used index pattern with a star
                // try to find out which index it is about

                // use mappings if there is only 1 index with selected type switch to it
                $http.get('elasticsearch/' + $scope.c.index + '/_mappings')
                .then(function (response) {
                  var indexesWithSelectedType = [];
                  for (var indexId in response.data) {
                    if (response.data[indexId].mappings) {
                      for (var type in response.data[indexId].mappings) {
                        if (response.data[indexId].mappings.hasOwnProperty(type)) {
                          if (type === $scope.c.type) {
                            indexesWithSelectedType.push(indexId);
                          }
                        }
                      }
                    }
                  }
                  if (indexesWithSelectedType.length === 1) {
                    $scope.entityUriHolder.entityURI =
                      indexesWithSelectedType[0] + '/' +
                      $scope.c.type + '/' +
                      $scope.c.id + '/' +
                      $scope.c.column;

                  } else {
                    notify('Please use more restrictive indexPattern for entity selection. ' +
                           'Currently selected one [' + $scope.c.index + '] is too ambiguous.');
                  }
                });

              } else {

                $scope.entityUriHolder.entityURI =
                  $scope.c.index + '/' +
                  $scope.c.type + '/' +
                  $scope.c.id + '/' +
                  $scope.c.column;

              }
            }
          });

        }
      };
    });
});
