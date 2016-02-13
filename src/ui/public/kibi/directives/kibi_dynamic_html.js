define(function (require) {

  require('ui/modules').get('kibana')
  .directive('kibiDynamicHtml', function ($compile) {
    return {
      restrict: 'A',
      replace: true,
      link: function ($scope, $ele, $attrs) {
        $scope.$watch($attrs.kibiDynamicHtml, function (html) {
          $ele.html(html);
          $compile($ele.contents())($scope);
        });
      }
    };
  });

});
