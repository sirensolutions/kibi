import 'ui/kibi/directives/kibi_param_entity_uri.less';
import 'ui/kibi/directives/kibi_select';
import _ from 'lodash';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { IndexPathProvider } from 'ui/kibi/components/commons/_index_path';
import template from 'ui/kibi/directives/kibi_param_entity_uri.html';

uiModules
.get('kibana')
.directive('kibiParamEntityUri', function (es, kibiState, Private, createNotifier) {
  const indexPath = Private(IndexPathProvider);
  const notify = createNotifier({
    location: 'Selected Entity'
  });

  return {
    restrict: 'E',
    replace: true,
    scope: {
      entityUriHolder: '='
    },
    template,
    link: function ($scope) {
      $scope.c = {
        indexPattern: null,
        index: null,
        type: null,
        id: null,
        extraIndexPatternItems: [],
        extraTypeItems: [],
        extraIdItems: []
      };

      const updateSelectedEntity = $scope.updateSelectedEntity = function () {
        const entity = kibiState.getEntityURI();
        if (entity) {
          const { index, type, id } = entity;

          if (index) {
            $scope.c.extraIndexPatternItems = [
              {
                label: index,
                id: index,
                value: index
              }
            ];
          }
          if (type) {
            $scope.c.extraTypeItems = [
              {
                label: type,
                id: type,
                value: type
              }
            ];
          }
          if (id) {
            $scope.c.extraIdItems = [
              {
                label: id,
                id: id,
                value: id
              }
            ];
          }

          if (!$scope.c.indexPattern) {
            $scope.c.indexPattern = index;
          }
          $scope.c.index = index;
          $scope.c.type = type;
          $scope.c.id = id;
        } else {
          $scope.c.indexPattern = null;
        }
      };

      $scope.$listen(kibiState, 'save_with_changes', function (diff) {
        if (diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
          updateSelectedEntity();
        }
      });
      updateSelectedEntity();

      $scope.updateKibiState = function (index, type, id) {
        const path = indexPath(index);

        if (path.indexOf('*') !== -1) {
          return es.search({
            size: 1,
            index: path,
            body: {
              query: {
                ids: {
                  type: type,
                  values: [ id ]
                }
              }
            }
          })
          .then(function (response) {
            if (response.hits.total === 0) {
              notify.warning('No documents found for the specified selection.');
              kibiState.setEntityURI();
              kibiState.save();
              return;
            }
            const hit = response.hits.hits[0];
            if (response.hits.total > 1) {
              notify.warning('Found more than one document for the specified selection, selected the first one.');
            }
            kibiState.setEntityURI({ index: hit._index, type: hit._type, id: hit._id });
            kibiState.save();
          })
          .catch(function () {
            notify.error('An error occurred while fetching the selected entity, please check if Elasticsearch is running.');
            kibiState.setEntityURI();
            kibiState.save();
          });
        } else {
          kibiState.setEntityURI({ index, type, id });
          kibiState.save();
        }
      };

      $scope.$watchMulti(['c.indexPattern', 'c.type', 'c.id'], function (newV, oldV) {
        const diff = _.difference(newV, oldV);
        if (diff.length !== 3) {
          // index pattern changed
          if (oldV[0] !== newV[0]) {
            $scope.c.index = $scope.c.indexPattern;
            $scope.c.type = null;
            $scope.c.id = null;

            $scope.c.extraIndexPatternItems = [];
            $scope.c.extraTypeItems = [];
            $scope.c.extraIdItems = [];
          } else if (oldV[1] !== newV[1]) {
            // type changed
            $scope.c.id = null;
            $scope.c.extraIdItems = [];
          }
        }

        if ($scope.c.index && $scope.c.type && $scope.c.id) {
          $scope.updateKibiState($scope.c.index, $scope.c.type, $scope.c.id);
        }
      });
    }
  };
});
