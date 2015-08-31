define(function (require) {

  require('modules').get('kibana').directive('stStopClickEvent', function () {
    return {
      restrict: 'A',
      link: function (scope, element, attr) {
        element.bind('click', function (e) {
          e.stopPropagation();
        });
      }
    };
  });

});
