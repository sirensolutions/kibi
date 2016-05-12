define(function (require) {
  require('ui/modules').get('apps/settings')
  .directive('sourceFiltering', function ($window, createNotifier) {
    var notify = createNotifier();
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/sections/indices/_kibi_source_filtering.html'),
      link: function ($scope) {
        $scope.showHelp = false;
        $scope.sourceFiltering = JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
        $scope.save = function () {
          try {
            var sourceFiltering;

            if ($scope.sourceFiltering) {
              sourceFiltering = JSON.parse($scope.sourceFiltering);
              if (sourceFiltering.constructor !== Object) {
                throw new Error('You must enter a JSON object with "all" or an "kibi_graph_browser" field(s)');
              }
              for (var att1 in sourceFiltering) {
                if (sourceFiltering.hasOwnProperty(att1)) {
                  if (att1 !== 'all' && att1 !== 'kibi_graph_browser') {
                    throw new Error('The JSON object should have only either an "all" or a "kibi_graph_browser" attribute');
                  } else {
                    var value = sourceFiltering[att1];
                    for (var att2 in value) {
                      if (value.hasOwnProperty(att2) && att2 !== 'include' && att2 !== 'exclude') {
                        throw new Error('The nested properties can be only either an "include" or an "exclude" attribute');
                      }
                    }
                  }
                }
              }
              $scope.indexPattern.setSourceFiltering(sourceFiltering);
              notify.info('Updated the set of retrieved fields');
            } else if ($scope.indexPattern.getSourceFiltering()) {
              var confirmIfEmpty = 'The following configuration will be deleted:\n\n' +
                JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
              if ($window.confirm(confirmIfEmpty)) {
                $scope.indexPattern.setSourceFiltering(undefined);
                notify.info('All fields are now retrieved');
              } else {
                $scope.sourceFiltering = JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
              }
            }
          } catch (e) {
            notify.error(e);
          }
        };
      }
    };
  });
});
