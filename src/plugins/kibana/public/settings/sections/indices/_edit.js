// kibi: import authorization error
import { IndexPatternAuthorizationError } from 'ui/errors';
// kibi: end

define(function (require) {
  const _ = require('lodash');
  require('plugins/kibana/settings/sections/indices/_indexed_fields');
  require('plugins/kibana/settings/sections/indices/_scripted_fields');
  require('plugins/kibana/settings/sections/indices/_index_header');
  require('plugins/kibana/settings/sections/indices/_kibi_source_filtering'); // kibi: added by kibi

  require('ui/routes')
  .when('/settings/indices/:indexPatternId', {
    template: require('plugins/kibana/settings/sections/indices/_edit.html'),
    resolve: {
      indexPattern: function ($route, courier, Promise, createNotifier, kbnUrl) { // kibi: added Promise, createNotifier, kbnUrl
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        // kibi: handle authorization errors
        .catch((error) => {
          if (error instanceof IndexPatternAuthorizationError) {
            createNotifier().warning(`Access to index pattern ${$route.current.params.indexPatternId} is forbidden`);
            kbnUrl.redirect('/settings/indices');
            return Promise.halt();
          } else {
            return courier.redirectWhenMissing('/settings/indices')(error);
          }
        });
        // kibi: end
      }
    }
  });

  require('ui/modules').get('apps/settings')
  .controller('settingsIndicesEdit', function ($scope, $location, $route, config, courier, createNotifier, Private, AppState, docTitle) {
    const notify = createNotifier();
    const $state = $scope.state = new AppState();
    const refreshKibanaIndex = Private(require('plugins/kibana/settings/sections/indices/_refresh_kibana_index'));

    $scope.kbnUrl = Private(require('ui/url'));
    $scope.indexPattern = $route.current.locals.indexPattern;
    docTitle.change($scope.indexPattern.id);
    const otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

    const fieldTypes = Private(require('plugins/kibana/settings/sections/indices/_field_types'));
    $scope.$watch('indexPattern.fields', function () {
      $scope.fieldTypes = fieldTypes($scope.indexPattern);
    });

    $scope.changeTab = function (obj) {
      $state.tab = obj.index;
      $state.save();
    };

    $scope.$watch('state.tab', function (tab) {
      if (!tab) $scope.changeTab($scope.fieldTypes[0]);
    });

    $scope.$watchCollection('indexPattern.fields', function () {
      $scope.conflictFields = _.filter($scope.indexPattern.fields, {type: 'conflict'});
    });

    $scope.refreshFields = function () {
      $scope.indexPattern.refreshFields();
    };

    $scope.removePattern = function () {
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.delete('defaultIndex');
        if (otherIds.length) {
          config.set('defaultIndex', otherIds[0]);
        }
      }

      courier.indexPatterns.delete($scope.indexPattern)
      .then(refreshKibanaIndex)
      .then(function () {
        $location.url('/settings/indices');
      })
      .catch(notify.error); // kibi: changed from fatal to error
    };

    $scope.setDefaultPattern = function () {
      config.set('defaultIndex', $scope.indexPattern.id);
    };

    $scope.setIndexPatternsTimeField = function (field) {
      if (field.type !== 'date') {
        notify.error('That field is a ' + field.type + ' not a date.');
        return;
      }
      $scope.indexPattern.timeFieldName = field.name;
      return $scope.indexPattern.save();
    };
  });
});
