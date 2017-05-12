import chrome from 'ui/chrome';
import uiModules from 'ui/modules';

/**
 * Returns a mutable Set of types managed by the saved objects API.
 */
uiModules
.get('kibana')
.service('savedObjectsAPITypes', function () {
  return new Set([
    'visualization',
    'index-pattern',
    'config',
    'dashboard',
    'dashboardgroup',
    'query',
    'template',
    'datasource',
    'search',
    'timelion-sheet'
  ]);
})
.value('savedObjectsAPIUrl', (function () {
  const a = document.createElement('a');
  a.href = chrome.addBasePath('/api/saved-objects/v1');
  return a.href;
}()));
