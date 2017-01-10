define(function (require) {
  const _ = require('lodash');
  require('plugins/spyModes/multi_search_spy_mode.less');
  function VisSpyMulti() {
    return {
      name: 'multiSearch',
      display: 'Multi Search',
      order: 5,
      allowSpyMode: function (visType) {
        return visType.requiresMultiSearch;
      },
      template: require('plugins/spyModes/multi_search_spy_mode.html'),
      link: function ($scope) {
        $scope.multiSearchData.translateQueries();
        $scope.filterjoinStats = _.map($scope.multiSearchData.getData(), (item) => $scope.multiSearchData.getFilterjoinStats(item));
        $scope.$watch('multiSearchData', () => {
          if ($scope.multiSearchData) {
            $scope.multiSearchData.translateQueries();
            $scope.filterjoinStats = _.map($scope.multiSearchData.getData(), (item) => $scope.multiSearchData.getFilterjoinStats(item));
          }
        }, true);
      }
    };
  }

  require('ui/registry/spy_modes').register(VisSpyMulti);
});
