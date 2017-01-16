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

  if (!path.startsWith('/management/kibana/')) {
    return;
  }
  return path.replace(/\/management\/kibana\/([^/]+).*/, (match, sectionName) => sectionName);
}

/**
 * _getScope returns the scope associated with the section's editor
 *
 * @param $location the location service
 * @returns the scope for the section
 */
function _getScope($location) {
  const sectionName = _getSectionName($location);
  switch (sectionName) {
    case 'dashboardgroups':
      return angular.element(document.getElementById('dashboard_groups_editor')).scope();
    case 'templates':
      return angular.element(document.getElementById('templates_editor')).scope();
    case 'relations':
      return angular.element(document.getElementById('relations')).scope();
    case 'queries':
      return angular.element(document.getElementById('queries_editor')).scope();
    case 'datasources':
      return angular.element(document.getElementById('datasources_editor')).scope();
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
    hide = hide && !path.startsWith(`/management/kibana/${sectionName}`);
  }
  return hide;
}

// register the new button
registry.register(function ($location) {
  return {
    appName: 'management-subnav',
    key: 'new',
    order: 1,
    run() {
      const scope = _getScope($location);

      if (scope) {
        scope.newObject();
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
.register(function ($location) {
  return {
    appName: 'management-subnav',
    key: 'save',
    order: 2,
    run() {
      const scope = _getScope($location);

      if (scope) {
        scope.saveObject();
      }
    },
    tooltip() {
      return `Save ${_getDisplayName($location)}`;
    },
    disableButton() {
      const scope = _getScope($location);

      if (!scope) {
        return true;
      }
      return !scope.isValid();
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
        return `#/management/kibana/${_getSectionName($location)}/${hit.id}`;
      };
    },
    testId: 'open'
  };
});
