define(function (require) {
  const _ = require('lodash');
  const fieldExcludedFor = require('./kibi_field_excluded_for');
  const joinFields = require('ui/kibi/settings/sections/indices/join_fields');
  require('ui/paginated_table');

  require('ui/modules').get('apps/settings')
  .directive('indexedFields', function ($filter, config) {
    const templates = {
      all: '<i class="fa fa-globe" aria-label="excluded in any visualisation" title="excluded in any visualisation"></i> ',
      kibi_graph_browser: '<i class="fa fak-graph" aria-label="excluded in graph browser" title="excluded in graph browser"></i>'
    };

    const yesTemplate = '<i class="fa fa-check" aria-label="yes"></i>';
    const noTemplate = '';
    const nameHtml = require('plugins/kibana/settings/sections/indices/_field_name.html');
    const typeHtml = require('plugins/kibana/settings/sections/indices/_field_type.html');
    const controlsHtml = require('plugins/kibana/settings/sections/indices/_field_controls.html');
    const filter = $filter('filter');

    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/sections/indices/_indexed_fields.html'),
      scope: true,
      link: function ($scope) {
        const rowScopes = []; // track row scopes, so they can be destroyed as needed
        $scope.perPage = 25;
        $scope.columns = [
          { title: 'name' },
          { title: 'type' },
          { title: 'format' },
          { title: 'analyzed', info: 'Analyzed fields may require extra memory to visualize' },
          { title: 'indexed', info: 'Fields that are not indexed are unavailable for search' },
          { title: 'excluded', info: 'Fields that are not retrieved as part of the _source object per hit' }, // kibi: added excluded field
          { title: 'controls', sortable: false }
        ];

        $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter'], refreshRows);

        function refreshRows() {
          // clear and destroy row scopes
          _.invoke(rowScopes.splice(0), '$destroy');

          const sourceFiltering = $scope.indexPattern.getSourceFiltering();
          const relations = config.get('kibi:relations');
          const fields = filter($scope.indexPattern.getNonScriptedFields(), $scope.fieldFilter);
          _.find($scope.fieldTypes, {index: 'indexedFields'}).count = fields.length; // Update the tab count

          $scope.rows = fields.map(function (field) {
            const childScope = _.assign($scope.$new(), {
              field: field,
              join: joinFields(relations.relationsIndices, $scope.indexPattern.id, field.name)
            });
            rowScopes.push(childScope);

            return [
              {
                markup: nameHtml,
                scope: childScope,
                value: field.displayName
              },
              {
                markup: typeHtml,
                scope: childScope,
                value: field.type
              },
              _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
              {
                markup: field.analyzed ? yesTemplate : noTemplate,
                value: field.analyzed
              },
              {
                markup: field.indexed ? yesTemplate : noTemplate,
                value: field.indexed
              },
              // kibi: added excluded field
              {
                markup: _.map(fieldExcludedFor(sourceFiltering, field.displayName), function (visType) { return templates[visType]; })
              },
              {
                markup: controlsHtml,
                scope: childScope
              }
            ];
          });
        }
      }
    };
  });
});
