define(function (require) {
  var html = require('text!components/tooltip/tooltip.html');

  require('modules').get('kibana')
  .config(function ($tooltipProvider) {
    $tooltipProvider.options({
      placement: 'bottom',
      animation: true,
      popupDelay: 150,
      appendToBody: false
    });
  })
  .directive('kbnTooltip', function () {
    return {
      restrict: 'E',
      template: html,
      transclude: true,
      replace: true,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.text = attr.text;
        $scope.placement = attr.placement || 'top';
        $scope.delay = attr.delay || 400;
        $scope.appendToBody = attr.appendToBody || 0;

        // added by sindicetech so the tooltip text can be assign more dynamically
        attr.$observe('text', function (value) {
          $scope.text = value;
        });
      }
    };
  });
});