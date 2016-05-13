define(function (require) {
  var _ = require('lodash');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules').get('kibana/kibi_query_viewer_vis')

  .directive('kibiQueryViewerVisParams', function ($rootScope, kbnUrl, Private, createNotifier) {

    var notify = createNotifier({
      location: 'Kibi Query Viewer Params'
    });

    return {
      restrict: 'E',
      template: require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_params.html'),
      link: function ($scope) {

        var _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));

        var updateScope = function () {
          $scope.jsonError = [];
          $scope.vis.params.queryOptions = _.map($scope.vis.params.queryOptions, function (option, index) {
            $scope.jsonError.push({
              message: '',
              block: ''
            });
            if (!option) {
              return option;
            }
            if (!option.templateVars) {
              option.templateVars = {};
            }
            try {
              if (option._templateVarsString) {
                option.templateVars = JSON.parse(option._templateVarsString);
              }

              if (option._label) {
                option.templateVars.label = option._label;
              } else if (!option.templateVars.label) {
                option.templateVars.label = '';
              }
            } catch (err) {
              $scope.jsonError[index].message = err.toString();
            }
            return option;
          });
        };

        $scope.$watch(function (myscope) {
          // only triggers when the queryId, template vars or the _label change
          return _.map(myscope.vis.params.queryOptions, function (option) {
            return option._templateVarsString + option._label + option.queryId;
          });
        }, function () {
          updateScope();

          var queryIds = _($scope.vis.params.queryOptions).pluck('queryId').compact().value();

          _shouldEntityURIBeEnabled(queryIds, null, true).then((results) => {
            let value = false;

            _.each($scope.vis.params.queryOptions, (queryOption, index) => {
              queryOption.isEntityDependent = results[index];
              if (results[index]) {
                value = true;
              }
            });
            $scope.vis.params.hasEntityDependentQuery = value;

            $rootScope.$emit('kibi:entityURIEnabled:kibiqueryviewer', value);
          }).catch(function (err) {
            notify.warning('Could not determine that widget need entityURI\n' + JSON.stringify(err, null, ' '));
          });
        }, true);

        $scope.editTemplate = function (index) {
          kbnUrl.change('/settings/templates/' + $scope.vis.params.queryOptions[index].templateId);
        };

        $scope.editQuery = function (index) {
          kbnUrl.change('/settings/queries/' + $scope.vis.params.queryOptions[index].queryId);
        };

      }
    };
  });

});
