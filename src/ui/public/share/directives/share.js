const app = require('ui/modules').get('kibana');

//kibi: add Private and createNotifier
app.directive('share', function (Private, createNotifier, $timeout) {

  //kibi: add reference session helper
  const kibiSessionHelper = Private(require('ui/kibi/helpers/kibi_session_helper/kibi_session_helper')); // kibi: added to persist session object

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectTypePlural: '@', // kibi: added as we have share all option
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: require('ui/share/views/share.html'),
    // kibi: flush and detach session before enabling sharing widgets
    link: function ($scope, element) {
      const notify = createNotifier({
        location: 'Share'
      });

      $scope.showError = false;
      $scope.flushing = true;
      $scope.currentSessionId = '';
      $scope.sharedSessionId = '';

      kibiSessionHelper.detach()
      .then(({currentSessionId, detachedSessionId}) => {
        $scope.currentSessionId = currentSessionId;
        $scope.sharedSessionId = detachedSessionId;
        $scope.flushing = false;
      })
      .catch((error) => {
        $scope.showError = true;
        notify.error(error);
      });

    },
    // kibi: end
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;
    }
  };
});
