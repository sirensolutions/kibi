define(function (require) {

  require('ui/kibi/directives/kibi_dashboard_toolbar.less');

  var app = require('ui/modules').get('app/dashboard');

  app.directive('kibiDashboardToolbar', function (getAppState, Private, $rootScope) {

    var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper'));

    return {
      restrict: 'E',
      //require: '^dashboardApp', // kibi: does not inherits from dashboardApp because we want to place it in different place
      template: require('ui/kibi/directives/kibi_dashboard_toolbar.html'),
      link: function ($scope, $el) {

        // here handle the calls and pass it to dashboard app
        $scope.newDashboard = function () {
          $rootScope.$emit('kibi:dashboard:invoke-method', 'newDashboard');
        };

        $scope.removeAllFilters = function () {
          // remove all filters and queries acros dashboards
          // except pinned filters
          var appState = getAppState();
          appState.filters = [];
          appState.query = {query_string: {analyze_wildcard: true, query: '*'}};
          appState.save();

          kibiStateHelper.removeAllFilters();
          kibiStateHelper.removeAllQueries();

          // if join_set was deleted
          // emit event so others can react (kibiStateHelper, relationalPanel)

          // here we would have to check that the join_set is either in app state or kibi state
          // we skip the check and simply emit the event
          $rootScope.$emit('kibi:join_set:removed');
        };

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('kibi:dashboard:set-property', 'configTemplate', $scope.configTemplate);
        }, true);

        var off = $rootScope.$on('stDashboardOnProperty', function (event, property, value) {
          $scope[property] = value;
        });
        $scope.$on('$destroy', off);
      }
    };
  });
});
