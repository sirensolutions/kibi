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
        $scope.focused = [];

        $scope.isIntraIndexRelation = function (relationId) {
          if (!relationId) return false;

          const relation = relationId.split('/').filter((val) => { return val.length > 0; });
          if (relation.length > 4) {
            const sameIndex = relation.slice(2, relation.length).find((e) => { return e === relation[0]; });
            const cmd = 'curl -XPUT host:port/';
            if (sameIndex) {
              if (relation.length === 5) {
                $scope.intraIndexRelationInfo = {
                  aliases :[
                    `${cmd}${relation[0]}/_alias/a_type_name`,
                    `${cmd}${relation[0]}/_alias/b_type_name`
                  ]
                };
              } else {
                $scope.intraIndexRelationInfo = {
                  aliases :[
                    `${cmd}${relation.slice(0, 2).join('/_alias/')}`,
                    `${cmd}${relation.slice(3, 5).join('/_alias/')}`
                  ]
                };
              }
              return true;
            }
            return false;
          }

          return false;
        };

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
          $scope.focused.push(false);
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
          onFocus: function (index) {
            _.fill($scope.focused, false);
            $scope.focused[index] = true;
          },
          onBlur: function (index) {
            _.fill($scope.focused, false);
          },

        };
      }
    };
  });
});
