define(function (require) {

  require('modules')
    .get('kibana')
    .directive('stDynamicHtml', function ($compile) {
    return {
      restrict: 'A',
      replace: true,
      link: function ($scope, $ele, $attrs) {
        $scope.$watch($attrs.stDynamicHtml, function (html) {
          $ele.html(html);
          $compile($ele.contents())($scope);
        });
      }
    };
  });
});
