import _ from 'lodash';
import './index_header';
import './indexed_fields_table';
import './scripted_fields_table';
import './scripted_field_editor';
import './source_filters_table';
// kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
import UrlProvider from 'ui/url';
import { IndicesEditSectionsProvider } from './edit_sections';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';

// kibi: import authorization error
import { IndexPatternAuthorizationError } from 'ui/errors';
// kibi: end

uiModules.get('apps/management')
.controller('managementIndicesEdit', function (
    $scope, $location, $route, config, courier, createNotifier, Private, AppState, docTitle, confirmModal, ontologyClient) {

  const notify = createNotifier();
  const $state = $scope.state = new AppState();
  // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API

  $scope.kbnUrl = Private(UrlProvider);
  $scope.indexPattern = $route.current.locals.selectedEntity;
  docTitle.change($scope.indexPattern.id);
  const otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

  $scope.$watch('indexPattern.fields', function () {
    // if ($scope.indexPattern.fields) {
      $scope.editSections = Private(IndicesEditSectionsProvider)($scope.indexPattern);
      $scope.refreshFilters();
    // }
  });

  $scope.refreshFilters = function () {
    const indexedFieldTypes = [];
    const scriptedFieldLanguages = [];
    if ($scope.indexPattern.fields) {
      $scope.indexPattern.fields.forEach(field => {
        if (field.scripted) {
          scriptedFieldLanguages.push(field.lang);
        } else {
          indexedFieldTypes.push(field.type);
        }
      });
    }

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
    if (!tab && $scope.editSections) $scope.changeTab($scope.editSections[0]);
  });

  $scope.$watchCollection('indexPattern.fields', function () {
    if ($scope.indexPattern.fields) {
      $scope.conflictFields = $scope.indexPattern.fields
        .filter(field => field.type === 'conflict');
    }
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

  $scope.removeEntity = function () {

  };

  $scope.removePattern = function () {
    function doRemove() {
      // kibi: here is fine to use config.get('defaultIndex')
      // if user do not have rights s/he will get an authorisation error
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.remove('defaultIndex');
        if (otherIds.length) {
          config.set('defaultIndex', otherIds[0]);
        }
      }

      return courier.indexPatterns.get($scope.indexPattern.id)
      .then((indexPatternObj) => {
        // kibi: change '$location.url('/management/kibana/index')'
        // to '$location.url('/management/siren/entities')'
        return courier.indexPatterns.delete(indexPatternObj)
        // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
        .then(function () {
          return ontologyClient.deleteEntity(indexPatternObj.id)
          .then($location.url('/management/siren/entities'));
        })
        .catch(notify.fatal);
      });
    }

    let removeLabel = 'entity identifier';
    if ($scope.indexPattern.type === 'INDEX_PATTERN') {
      removeLabel = 'index pattern';
    }

    const confirmModalOptions = {
      confirmButtonText: 'Remove ' + removeLabel,
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
