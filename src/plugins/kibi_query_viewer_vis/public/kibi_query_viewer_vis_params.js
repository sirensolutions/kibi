define(function (require) {
  var _ = require('lodash');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');

  require('ui/modules').get('kibana/kibi_query_viewer_vis')

  .directive('kibiQueryViewerVisParams', function ($rootScope, kbnUrl, createNotifier) {

    var notify = createNotifier({
      location: 'Kibi Query Viewer Params'
    });

    return {
      restrict: 'E',
      template: require('plugins/kibi_query_viewer_vis/kibi_query_viewer_vis_params.html'),
      link: function ($scope) {
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
            return option._templateVarsString + option._label + option.query.id;
          });
        }, function () {
          updateScope();

          let value = false;
          _.each($scope.vis.params.queryOptions, (queryOption, index) => {
            queryOption.isEntityDependent = queryOption.query.is_entity_dependent;
            if (queryOption.query.is_entity_dependent) {
              value = true;
            }
          });
          $rootScope.$emit('kibi:entityURIEnabled:kibiqueryviewer', value);
        }, true);

        $scope.editTemplate = function (index) {
          kbnUrl.change('/settings/templates/' + $scope.vis.params.queryOptions[index].templateId);
        };

        $scope.editQuery = function (index) {
          kbnUrl.change('/settings/queries/' + $scope.vis.params.queryOptions[index].query.id);
        };

      }
    };
  });

});
