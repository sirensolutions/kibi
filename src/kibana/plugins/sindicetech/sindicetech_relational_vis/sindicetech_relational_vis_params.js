define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_relational_vis')
  .directive('sindicetechRelationalVisParams', function ($window) {
    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_relational_vis/sindicetech_relational_vis_params.html'),
      link: function ($scope) {

        var updateScope = function () {
          $scope.vis.params.random = $window.performance.now();
        };

        $scope.$watch('vis.params.buttons', function () {
          updateScope();
        }, true);


        $scope.addNewButton = function () {
          if (!$scope.vis.params.buttons) {
            $scope.vis.params.buttons = [];
          }

          $scope.vis.params.buttons.push({
          });
        };

        $scope.removeButton = function (index) {
          $scope.vis.params.buttons.splice(index, 1);
          updateScope();
        };

        $scope.upButton = function (index) {
          if (index > 0) {
            var newIndex = index - 1;
            var currentElement = _.clone($scope.vis.params.buttons[index], true);
            $scope.vis.params.buttons.splice(index, 1);
            $scope.vis.params.buttons.splice(newIndex, 0, currentElement);
            updateScope();
          }
        };

        $scope.downButton = function (index) {
          if (index < $scope.vis.params.buttons.length - 1) {
            var newIndex = index + 1;
            var currentElement = _.clone($scope.vis.params.buttons[index], true);
            $scope.vis.params.buttons.splice(index, 1);
            $scope.vis.params.buttons.splice(newIndex, 0, currentElement);
            updateScope();
          }
        };

      }
    };
  });
});
