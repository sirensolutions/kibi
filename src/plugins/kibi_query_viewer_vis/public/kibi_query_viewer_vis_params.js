define(function (require) {
  var _ = require('lodash');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules').get('kibana/kibi_query_viewer_vis')

  .directive('kibiQueryViewerVisParams', function (kbnUrl) {
    return {
      restrict: 'E',
      template: require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_params.html'),
      link: function ($scope) {

        // Handle label textbox changes
        $scope.labelChanged = function () {
          $scope.vis.params.queryDefinitions = _.map($scope.vis.params.queryDefinitions, function (option, index) {
            if (!option) {
              return option;
            }
            if (!option.templateVars) {
              option.templateVars = {};
            }
            if (option._label) {
              if (option._templateVarsString) {
                option.templateVars = JSON.parse(option._templateVarsString);
              }
              option.templateVars.label = option._label;
            } else if (!option.templateVars.label || !option._label) {
              option.templateVars.label = '';
            }
            option._templateVarsString = JSON.stringify(option.templateVars, null, ' ');
            return option;
          });
        };

        // Handle template textarea changes
        $scope.templateChanged = function () {
          $scope.jsonError = [];
          $scope.vis.params.queryDefinitions = _.map($scope.vis.params.queryDefinitions, function (option, index) {
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
                let toJson = JSON.parse(option._templateVarsString);
                option.templateVars.label = toJson.label;
                option._label = toJson.label;
              }
            } catch (err) {
              $scope.jsonError[index].message = err.toString();
            }
            return option;
          });
        };

        $scope.$watch('vis.params.queryDefinitions', function () {
          // only triggers when the queryId, template vars or the _label change
          return _.map($scope.vis.params.queryDefinitions, function (option) {
            return option._templateVarsString + option._label + option.queryId;
          });
        });

        $scope.editTemplate = function (index) {
          kbnUrl.change('/settings/templates/' + $scope.vis.params.queryDefinitions[index].templateId);
        };

        $scope.editQuery = function (index) {
          kbnUrl.change('/settings/queries/' + $scope.vis.params.queryDefinitions[index].queryId);
        };

      }
    };
  });

});
