import _ from 'lodash';
import './index_header';
import './indexed_fields_table';
import './scripted_fields_table';
import './scripted_field_editor';
import './source_filters_table';
import { RefreshKibanaIndex } from '../refresh_kibana_index';
import UrlProvider from 'ui/url';
import { IndicesEditSectionsProvider } from './edit_sections';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import editTemplate from './edit_index_pattern.html';

// kibi: import authorization error
import { IndexPatternAuthorizationError } from 'ui/errors';
// kibi: end

uiRoutes
//TODO MERGE 5.5.2 add kibi comment as needed
.when('/management/siren/indices/:indexPatternId', {
  template: editTemplate,
  resolve: {
    indexPattern: function ($route, courier, Promise, createNotifier, kbnUrl) { // kibi: added Promise, createNotifier, kbnUrl
      return courier.indexPatterns
      .get($route.current.params.indexPatternId)
      // kibi: handle authorization errors
      .catch((error) => {
        if (error instanceof IndexPatternAuthorizationError) {
          createNotifier().warning(`Access to index pattern ${$route.current.params.indexPatternId} is forbidden`);
          kbnUrl.redirect('/management/siren/indices');
          return Promise.halt();
        } else {
          return courier.redirectWhenMissing('/management/siren/indices')(error);
        }
      });
      // kibi: end
    }
  }
});

uiRoutes
.when('/management/siren/indices', {
  resolve: {
    redirect: function ($location, config) {
      const defaultIndex = config.get('defaultIndex');
      let path = '/management/siren/index';

      if (defaultIndex) {
        path = `/management/siren/indices/${defaultIndex}`;
      }

      $location.path(path).replace();
    }
  }
});

uiModules.get('apps/management')
.controller('managementIndicesEdit', function (
    $scope, $location, $route, config, courier, createNotifier, Private, AppState, docTitle, confirmModal) {

  const notify = createNotifier();
  const $state = $scope.state = new AppState();
  const refreshKibanaIndex = Private(RefreshKibanaIndex);

  $scope.kbnUrl = Private(UrlProvider);
  $scope.indexPattern = $route.current.locals.indexPattern;
  docTitle.change($scope.indexPattern.id);
  const otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

  $scope.$watch('indexPattern.fields', function () {
    $scope.editSections = Private(IndicesEditSectionsProvider)($scope.indexPattern);
    $scope.refreshFilters();
  });

  $scope.refreshFilters = function () {
    const indexedFieldTypes = [];
    const scriptedFieldLanguages = [];
    $scope.indexPattern.fields.forEach(field => {
      if (field.scripted) {
        scriptedFieldLanguages.push(field.lang);
      } else {
        indexedFieldTypes.push(field.type);
      }
    });

    $scope.indexedFieldTypes = _.unique(indexedFieldTypes);
    $scope.scriptedFieldLanguages = _.unique(scriptedFieldLanguages);
  };

  $scope.changeFilter = function (filter, val) {
    $scope[filter] = val || ''; // null causes filter to check for null explicitly
  };

  $scope.changeTab = function (obj) {
    $state.tab = obj.index;
    $state.save();
  };

  $scope.$watch('state.tab', function (tab) {
    if (!tab) $scope.changeTab($scope.editSections[0]);
  });

  $scope.$watchCollection('indexPattern.fields', function () {
    $scope.conflictFields = $scope.indexPattern.fields
      .filter(field => field.type === 'conflict');
  });

  $scope.refreshFields = function () {
    const confirmModalOptions = {
      confirmButtonText: 'Refresh fields',
      onConfirm: () => { $scope.indexPattern.refreshFields(); }
    };
    confirmModal(
      'This will reset the field popularity counters. Are you sure you want to refresh your fields?',
      confirmModalOptions
    );
  };

  $scope.removePattern = function () {
    function doRemove() {
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.remove('defaultIndex');
        if (otherIds.length) {
          config.set('defaultIndex', otherIds[0]);
        }
      }

      //TODO MERGE 5.5.2 add kibi comment as needed
      courier.indexPatterns.delete($scope.indexPattern)
        .then(refreshKibanaIndex)
        .then(function () {
          $location.url('/management/siren/index');
        })
        .catch(notify.fatal);
    }

    const confirmModalOptions = {
      confirmButtonText: 'Remove index pattern',
      onConfirm: doRemove
    };
    confirmModal('Are you sure you want to remove this index pattern?', confirmModalOptions);
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
