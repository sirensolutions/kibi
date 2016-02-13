define(function (require) {

  require('ui/modules').get('kibana').directive('kibiStopClickEvent', function () {
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
