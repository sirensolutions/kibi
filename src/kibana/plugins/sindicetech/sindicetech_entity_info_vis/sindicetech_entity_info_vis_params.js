define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetech_entity_info_vis')

  .directive('sindicetechEntityInfoVisParams', function ($rootScope, kbnUrl, Private, Notifier) {

    var notify = new Notifier({
      location: 'Templated Query Viewer Params'
    });

    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_params.html'),
      link: function ($scope) {

        var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));

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

          var queryIds = _.map($scope.vis.params.queryOptions, function (option) {
            return option.queryId;
          });

          _shouldEntityURIBeEnabled(queryIds).then(function (value) {
            if ($scope.vis.params.enableQueryFields === false) {
              $rootScope.$emit('kibi:entityURIEnabled:entityinfo', false);
            } else {
              $rootScope.$emit('kibi:entityURIEnabled:entityinfo', value);
            }
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
