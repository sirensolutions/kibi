define(function (require) {

  require('css!directives/st_param_entity_uri.css');

  require('modules')
    .get('kibana')
    .directive('stParamEntityUri', function () {
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
            label: '',
            extraItems: []
          };

          $scope.$watch('entityUriHolder', function () {
            if ($scope.entityUriHolder) {
              if ($scope.entityUriHolder.entityURI) {
                var parts = $scope.entityUriHolder.entityURI.split('/');
                $scope.c.index  = parts[0];
                $scope.c.type   = parts[1];
                $scope.c.id     = parts[2];
                if (parts.length > 3) {
                  $scope.c.column = parts[3];
                  $scope.c.label  = parts[4];
                }
                if ($scope.c.id) {
                  $scope.c.extraItems = [{
                    label: $scope.c.id,
                    value: $scope.c.id
                  }];
                }
              }
            }
          });

          $scope.$watchMulti(['c.index', 'c.type', 'c.id'], function () {
            $scope.c.column = '';
            $scope.c.label = '';

            if ($scope.c.index && $scope.c.type && $scope.c.id) {
              $scope.entityUriHolder.entityURI =
                $scope.c.index + '/' +
                $scope.c.type + '/' +
                $scope.c.id;
            }
          });

        }
      };
    });
});
