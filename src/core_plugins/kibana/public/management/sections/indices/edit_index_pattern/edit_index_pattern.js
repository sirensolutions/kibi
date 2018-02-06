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

// kibi: removed routes. They're replaced by the ones in
// src/kibi_plugins/investigate_core/public/management/sections/kibi_entities/controllers/entities.js
uiModules.get('apps/management')
.controller('managementIndicesEdit', function (
  $scope, $location, $route, config, courier, createNotifier, Private, AppState, docTitle, confirmModal, ontologyClient, kbnUrl, $timeout) {

  const notify = createNotifier();
  const $state = $scope.state = new AppState();
  // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API

  $scope.kbnUrl = Private(UrlProvider);

  docTitle.change($scope.indexPattern.id);
  const otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

  const otherPatterns = _.filter($route.current.locals.indexPatterns, pattern => {
    return pattern.id !== $scope.indexPattern.id;
  });

  $scope.$watch('indexPattern.fields', function () {
    $scope.editSections = Private(IndicesEditSectionsProvider)($scope.indexPattern);
    $scope.refreshFilters();
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

  $scope.removePattern = function () {
    function doRemove() {
      // kibi: here is fine to use config.get('defaultIndex')
      // if user do not have rights s/he will get an authorisation error
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.remove('defaultIndex');

        if (otherPatterns.length) {
          config.set('defaultIndex', otherPatterns[0].id);
        }
      }

      return courier.indexPatterns.get($scope.indexPattern.id)
      .then((indexPatternObj) => {
        // kibi: change '$location.url('/management/kibana/index')'
        // to '$location.url('/management/siren/indexesandrelations')'
        return courier.indexPatterns.delete(indexPatternObj)
        // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
        .then(function () {
          return ontologyClient.deleteEntity(indexPatternObj.id)
          .then(kbnUrl.change('/management/siren/indexesandrelations'));
        })
        .catch(notify.error);
      });
    }

    const confirmModalOptions = {
      confirmButtonText: 'Remove index pattern',
      onConfirm: doRemove
    };
    confirmModal('Are you sure you want to remove this index pattern?', confirmModalOptions);
  };

  // kibi: added function to remove an entity
  $scope.removeEntity = function () {
    if ($route.current.locals.selectedEntity.type === 'INDEX_PATTERN') {
      $scope.removePattern();
    } else {
      $scope.removeEid();
    }
  };

  // kibi: added method to remove an entity identifier.
  $scope.removeEid = function () {
    function doRemove() {
      return ontologyClient.deleteEntity($route.current.locals.selectedEntity.id)
      .then(kbnUrl.change('/management/siren/indexesandrelations'));
    }

    const confirmModalOptions = {
      confirmButtonText: 'Remove entity identifier',
      onConfirm: doRemove
    };
    confirmModal('Are you sure you want to remove this entity identifier?', confirmModalOptions);
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

  $timeout(() => {
    if ($route.current.locals.activeTab) {
      $scope.changeTab(_.find($scope.editSections, 'title', $route.current.locals.activeTab));
    }
  });
});
