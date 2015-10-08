define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_entity_info_vis')

  .directive('sindicetechEntityInfoVisParams', function ($http, $rootScope, config, kbnUrl, $window, Private, Notifier) {

    var notify = new Notifier({
      location: 'Entity Info Widget Params'
    });

    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_params.html'),
      link: function ($scope) {

        var _shouldEntityURIBeEnabled = Private(require('plugins/sindicetech/commons/_should_entity_uri_be_enabled'));

        $scope.updateScope = function () {
          $scope.vis.params.queryOptions = _.map($scope.vis.params.queryOptions, function (option) {
            try {
              option.templateVars = JSON.parse(option._templateVarsString);
            } catch (err) {
              console.log(err);
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
              $rootScope.$emit('entityURIEnabled', false);
            } else {
              $rootScope.$emit('entityURIEnabled', value);
            }
          }).catch(function (err) {
            notify.warning('Could not determine that widget need entityURI' + JSON.stringify(err, null, ' '));
          });
        }, true);

        $scope.editTemplate = function (index) {
          kbnUrl.change('/settings/templates/' + $scope.vis.params.queryOptions[index].templateId);
        };

      }
    };
  });

});
