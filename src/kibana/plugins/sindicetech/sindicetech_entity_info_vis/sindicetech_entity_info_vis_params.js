define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_entity_info_vis')

  .directive('sindicetechEntityInfoVisParams', function ($rootScope, kbnUrl, $window, Private, Notifier) {

    var notify = new Notifier({
      location: 'Templated Query Viewer Params'
    });

    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_params.html'),
      link: function ($scope) {

        var _shouldEntityURIBeEnabled = Private(require('plugins/sindicetech/commons/_should_entity_uri_be_enabled'));

        $scope.updateScope = function () {
          $scope.vis.params.queryOptions = _.map($scope.vis.params.queryOptions, function (option) {
            $scope.jsonError = {
              message: '',
              block: ''
            };
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

              option.templateVars.label = '';
              if (option._label) {
                option.templateVars.label = option._label;
              }
            } catch (err) {
              $scope.jsonError.message = err.toString();
            }
            return option;
          });

          // trick to force the option window to pickup the changes
          // as it will only pickup changes on primitive values
          // while we are editind an object here
          $scope.vis.params.random = $window.performance.now();
        };

        $scope.$watch('vis.params.queryOptions', function () {
          $scope.updateScope();

          var queryIds = _.map($scope.vis.params.queryOptions, function (snippet) {
            return snippet.queryId;
          });

          _shouldEntityURIBeEnabled(queryIds).then(function (value) {
            if ($scope.vis.params.enableQueryFields === false) {
              $rootScope.$emit('kibi:entityURIEnabled', false);
            } else {
              $rootScope.$emit('kibi:entityURIEnabled', value);
            }
          }).catch(function (err) {
            notify.warning('Could not determine that widget need entityURI' + JSON.stringify(err, null, ' '));
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
