define(function (require) {
  const module = require('ui/modules').get('app/discover');
  /**
  * kibiTemplatedResult directive.
  *
  * Display the results through a template
  * ```
  * <tr ng-repeat="row in rows" kibi-table-row="row"></tr>
  * ```
  */
  module.directive('kibiCustomView', function ($compile,savedTemplates,$cacheFactory) {
    return {
      scope: {
        sorting: '=',
        columns: '=',
        hits: '=',
        indexPattern: '=?',
        searchSource: '=?',
        infiniteScroll: '=?',
        filter: '=?',
        templateId: '=?',
        templateSource: '=?', // used in template editor
        mode: '@',
        cellClickHandlers: '=',
        queryColumn: '=',
        columnAliases: '=?',
      },
      compile: function (tElem, tAttrs) {
        return function (scope, iElem, iAttrs) {
          const action = function () {
            try {
              if (scope.templateSource === undefined && !(scope.templateId)) {
                iElem.html('<p class="danger">template-id or template-source is required</p>');
                return;
              }
              if (scope.mode) {
                // mode is set to record when desiging kibi data table visualization.
                // mode is set to replay in template designer.
                const $cache = $cacheFactory.get('kibi-custom-view') || $cacheFactory('kibi-custom-view');
                switch (scope.mode) {
                  case 'record':
                    $cache.put('hits', scope.hits || []);
                    $cache.put('sorting', scope.sorting);
                    $cache.put('columns', scope.columns);
                    $cache.put('indexPattern', scope.indexPattern);
                    $cache.put('searchSource', scope.searchSource);
                    $cache.put('filter', scope.filter);
                    $cache.put('queryColumn', scope.queryColumn);
                    $cache.put('columnAliases', scope.columnAliases);
                    break;
                  case 'replay':
                    if (!$cache.get('hits')) {
                      iElem.html('<p class="danger">To continue, first save the viewer and use in '
                        + '<em>Enhanced search results</em> visualization.</p>');
                      return;
                    }
                    scope.hits = scope.hits || $cache.get('hits');
                    scope.sorting = scope.sorting || $cache.get('sorting');
                    scope.columns = scope.columns || $cache.get('columns');
                    scope.indexPattern  = scope.indexPattern || $cache.get('indexPattern');
                    scope.searchSource = scope.searchSource || $cache.get('searchSource');
                    scope.filter = scope.filter || $cache.get('filter');
                    scope.queryColumn = scope.queryColumn || $cache.get('queryColumn');
                    scope.columnAliases = scope.columnAliases || $cache.get('columnAliases');
                    break;
                  default:
                    break;
                }
              }
              if (scope.templateId) {
                savedTemplates.get(scope.templateId).then((savedTemplate) => {
                  if (savedTemplate.templateEngine !== 'html-angular') {
                    iElem.html('<p class="danger">Only html-angular templates are supported. Try a different viewer.</p>');
                    return;
                  }
                  iElem.html(savedTemplate.templateSource);
                  $compile(iElem.contents()) (scope);
                }).catch(function (e) {
                  iElem.empty().append('An error occurred in the custom view: ' + e.message);
                });
              } else {
                try {
                  iElem.html(scope.templateSource);
                  $compile(iElem.contents()) (scope);
                } catch (e) {
                  iElem.empty().append('An error occurred in the custom view: ' + e.message);
                }
              }

            } catch (e) {
              iElem.empty().append('An error occurred in the custom view: ' + e.message);
            }
          };

          scope.$watch('templateId', action);
          scope.$watch('templateSource', action);

        };
      }
    };
  });
});
