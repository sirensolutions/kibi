import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';
import openTemplate from './load_object.html';

/**
 * _getDisplayName returns the kibi's management section name fit for display
 */
function _getDisplayName($location) {
  switch (_getSectionName($location)) {
    case 'dashboardgroups':
      return 'Dashboard Group';
    case 'templates':
      return 'Template';
    case 'queries':
      return 'Query';
    case 'datasources':
      return 'Datasource';
    case 'relations':
      return 'Relations';
  }
}

/**
 * _getSectionName returns the name of the kibi's management section
 */
function _getSectionName($location) {
  const path = $location.path();

  if (!path.startsWith('/management/siren/')) {
    return;
  }
  return path.replace(/\/management\/siren\/([^/]+).*/, (match, sectionName) => sectionName);
}

/**
 * _getMethod returns the scope associated with the section's editor
 *
 * @param $document service the document service
 * @param $location service the location service
 * @param name string the name of the method
 * @returns function the method bound to the element
 */
function _getMethod($document, $location, name) {
  const sectionName = _getSectionName($location);
  switch (sectionName) {
    case 'dashboardgroups':
      return angular.element($document.find('#dashboard_groups_editor')).data(name);
    case 'templates':
      return angular.element($document.find('#templates_editor')).data(name);
    case 'relations':
      return angular.element($document.find('#relations')).data(name);
    case 'queries':
      return angular.element($document.find('#queries_editor')).data(name);
    case 'datasources':
      return angular.element($document.find('#datasources_editor')).data(name);
  }
}

/**
 * _hideButton hides the button on all pages except for the given section names
 *
 * @param path the current path
 * @param ...sectionNames list of section names where the button can appear in
 * @returns true if the button should be hidden
 */
function _hideButton(path, ...sectionNames) {
  let hide = true;

  for (const sectionName of sectionNames) {
    hide = hide && !path.startsWith(`/management/siren/${sectionName}`);
  }
  return hide;
}

// register the new button
registry.register(function ($document, $location) {
  return {
    appName: 'management-subnav',
    key: 'new',
    order: 1,
    run() {
      const newObject = _getMethod($document, $location, 'newObject');

      if (newObject) {
        newObject();
      }
    },
    tooltip() {
      return `New ${_getDisplayName($location)}`;
    },
    hideButton() {
      return _hideButton($location.path(), 'dashboardgroups', 'templates', 'queries', 'datasources');
    },
    testId: 'new'
  };
})
// register the save button
.register(function ($location, $document) {
  return {
    appName: 'management-subnav',
    key: 'save',
    order: 2,
    run() {
      const saveObject = _getMethod($document, $location, 'saveObject');

      if (saveObject) {
        saveObject();
      }
    },
    tooltip() {
      return `Save ${_getDisplayName($location)}`;
    },
    disableButton() {
      const isValid = _getMethod($document, $location, 'isValid');

      if (!isValid) {
        return true;
      }
      return !isValid();
    },
    hideButton() {
      return _hideButton($location.path(), 'dashboardgroups', 'templates', 'queries', 'datasources', 'relations');
    },
    testId: 'save'
  };
})
// register the open button
.register(function ($location) {
  return {
    appName: 'management-subnav',
    key: 'open',
    order: 3,
    template: openTemplate,
    tooltip() {
      return `Open ${_getDisplayName($location)}`;
    },
    hideButton() {
      return _hideButton($location.path(), 'dashboardgroups', 'templates', 'queries', 'datasources');
    },
    controller($scope) {
      $scope.sectionName = _getSectionName($location);
      $scope.displayName = _getDisplayName($location);
      $scope.makeUrl = function (hit) {
        return `#/management/siren/${_getSectionName($location)}/${hit.id}`;
      };
    },
    testId: 'open'
  };
});
