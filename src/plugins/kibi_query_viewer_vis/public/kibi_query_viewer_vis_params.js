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
        $scope.labelChanged = function (index) {
          let option = $scope.vis.params.queryDefinitions[index];
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
          } else {
            option.templateVars.label = '';
          }
          option._templateVarsString = JSON.stringify(option.templateVars, null, ' ');
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
                option.templateVars = toJson;
                option._label = toJson.label;
              }
            } catch (err) {
              $scope.jsonError[index].message = err.toString();
            }
            return option;
          });
        };

        $scope.editTemplate = function (index) {
          kbnUrl.change('/settings/templates/' + $scope.vis.params.queryDefinitions[index].templateId);
        };

        $scope.editQuery = function (index) {
          kbnUrl.change('/settings/queries/' + $scope.vis.params.queryDefinitions[index].queryId);
        };

        $scope.filterTemplates = function (item) {
          return item ? item.templateEngine === 'html-angular' : true;
        };

      }
    };
  });

});
