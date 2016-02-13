define(function (require) {
  var notify = require('ui/modules').get('kibana/notify');
  var _ = require('lodash');

  notify.directive('kbnNotifications', function ($rootScope, config) {
    return {
      restrict: 'E',
      scope: {
        list: '=list'
      },
      replace: true,
      template: require('ui/notify/partials/toaster.html'),
      link: function ($scope) {
        // kibi: added link function to be able to set kibi:awesomeDemoMode
        var updateAwesomeMode = function () {
          var awesomeDemoMode = config.get('kibi:awesomeDemoMode');
          $scope.awesomeDemoMode = awesomeDemoMode;
        };
        $rootScope.$on('init:config', updateAwesomeMode);
        $rootScope.$on('change:config.kibi:awesomeDemoMode', updateAwesomeMode);
        // kibi: end
      }
    };
  });
});
