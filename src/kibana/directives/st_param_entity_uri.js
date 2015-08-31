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

          $scope.$watch('datasourceType', function (datasourceType) {
            if (datasourceType === 'pgsql' || datasourceType === 'mysql' || datasourceType === 'sqlite' || datasourceType === 'jdbc') {
              $scope.placeholder = 'http://@TABLE@/@PKVALUE@';
            } else if (datasourceType === 'sparql') {
              $scope.placeholder = '@URI@';
            } else if (datasourceType === 'rest') {
              $scope.placeholder = 'rest://@VAR0@';
            } else {
              $scope.placeholder = 'Type entityURI here';
            }
          });
        }
      };
    });
});
