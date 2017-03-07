const app = require('ui/modules').get('kibana');

app.directive('share', function (Private, $timeout) {

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectTypePlural: '@', // kibi: added as we have share all option
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: require('ui/share/views/share.html'),
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;
    }
  };
});
