define(function (require) {

  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');
  require('ui/kibi/directives/kibi_menu_template');
  const _ = require('lodash');
  const menuTemplateHtml = require('ui/kibi/directives/kibi_menu_template_sequential_join_vis.html');

  require('ui/modules').get('kibana/kibi_kibi_sequential_join_vis')
  .directive('kibiSequentialJoinVisParams', function (config, Private, createNotifier) {

    return {
      restrict: 'E',
      template: require('plugins/kibi_sequential_join_vis/kibi_sequential_join_vis_params.html'),
      link: function ($scope) {

        const notify = createNotifier({
          location: 'Kibi Relational filter params'
        });

        const relations = config.get('kibi:relations');

        $scope.getLabel = function (relationId) {
          if (relationId) {
            const rel =  _.find(relations.relationsIndices, (rel) => {
              return rel.id === relationId;
            });
            if (rel) {
              return rel.label;
            }
          }
        };

        _.each($scope.vis.params.buttons, (button) => {
          if (!button.indexRelationId) {
            return;
          }
          const found = _.find(relations.relationsIndices, 'id', button.indexRelationId);
          if (!found) {
            notify.error('Could not find relation: ' + button.indexRelationId + '. Check relations configuration.');
            delete button.indexRelationId;
          }
        });

        const filteredRelations = _(relations.relationsIndices)
        .each((rel) => {
          if (!rel.onSelect) {
            rel.onSelect = function (button) {
              button.indexRelationId = rel.id;
              button.sourceDashboardId = null;
              button.targetDashboardId = null;
            };
          }
        })
        .sortBy(function (rel) {
          return rel.indices[0].indexPatternId;
        })
        .sortBy((rel) => rel.label)
        .value();

        $scope.menu = {
          template: menuTemplateHtml,
          relations: filteredRelations,
          onFocus: function () {
            $scope.menu.focused = true;
          },
          onBlur: function () {
            $scope.menu.focused = false;
          },

        };
      }
    };
  });
});
