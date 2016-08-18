define(function (require) {

  require('ui/kibi/directives/kibi_param_entity_uri.less');
  require('ui/kibi/directives/kibi_select');

  var _ = require('lodash');
  var chrome = require('ui/chrome');

  require('ui/modules').get('kibana')
  .directive('kibiParamEntityUri', function (kibiState, $http, Private, createNotifier) {

    var indexPath = Private(require('ui/kibi/components/commons/_index_path'));

    var notify = createNotifier({
      location: 'Selected Entity'
    });

    return {
      restrict: 'E',
      replace: true,
      scope: {
        entityUriHolder: '='
      },
      template: require('ui/kibi/directives/kibi_param_entity_uri.html'),
      link: function ($scope) {
        $scope.c = {
          indexPattern: null,
          index: null,
          type: null,
          id: null,
          column: null,
          extraIndexPatternItems: [],
          extraTypeItems: [],
          extraIdItems: []
        };

        $scope.$listen(kibiState, 'save_with_changes', function (diff) {
          if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
              diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
            const entityURI = kibiState.getEntityURI();
            if (entityURI) {
              var parts = entityURI.split('/');

              if (parts[0]) {
                $scope.c.extraIndexPatternItems = [
                  {
                    label: parts[0],
                    id: parts[0],
                    value: parts[0]
                  }
                ];
              }
              if (parts[1]) {
                $scope.c.extraTypeItems = [
                  {
                    label: parts[1],
                    id: parts[1],
                    value: parts[1]
                  }
                ];
              }
              if (parts[2]) {
                $scope.c.extraIdItems = [
                  {
                    label: parts[2],
                    id: parts[2],
                    value: parts[2]
                  }
                ];
              }

              if (!$scope.c.indexPattern) {
                $scope.c.indexPattern = parts[0];
              }
              $scope.c.index = parts[0];
              $scope.c.type = parts[1];
              $scope.c.id = parts[2];
              if (parts.length > 3) {
                $scope.c.column = parts[3];
              }
            } else {
              $scope.c.indexPattern = null;
            }
          }
        });

        $scope.$watchMulti(['c.indexPattern', 'c.type', 'c.id'], function (newV, oldV) {
          var diff = _.difference(newV, oldV);
          if (diff.length !== 3) {
            // index pattern changed
            if (oldV[0] !== newV[0]) {
              $scope.c.index = $scope.c.indexPattern;
              $scope.c.type = null;
              $scope.c.id = null;
              $scope.c.column = null;

              $scope.c.extraIndexPatternItems = [];
              $scope.c.extraTypeItems = [];
              $scope.c.extraIdItems = [];
            } else if (oldV[1] !== newV[1]) {
              // type changed
              $scope.c.id = null;
              $scope.c.column = null;
              $scope.c.extraIdItems = [];
            }
          }

          if ($scope.c.index && $scope.c.type && $scope.c.id) {

            var path = indexPath($scope.c.index);

            if (path.indexOf('*') !== -1) {
              $http.get(chrome.getBasePath() + '/elasticsearch/' + path + '/' + $scope.c.type + '/_search?q=_id:' + $scope.c.id)
              .then(function (response) {
                if (response.data.hits.total === 0) {
                  notify.warning('No documents found for the specified selection.');
                  kibiState.setEntityURI(null);
                  kibiState.save();
                  return;
                }
                var hit = response.data.hits.hits[0];
                if (response.data.hits.total > 1) {
                  notify.warning('Found more than one document for the specified selection, selected the first one.');
                }
                kibiState.setEntityURI(hit._index + '/' + hit._type + '/' + hit._id + '/' + $scope.c.column);
                kibiState.save();
              }).catch(function () {
                notify.error('An error occurred while fetching the selected entity, please check if Elasticsearch is running.');
                kibiState.setEntityURI(null);
                kibiState.save();
              });
            } else {
              kibiState.setEntityURI($scope.c.index + '/' + $scope.c.type + '/' + $scope.c.id + '/' + $scope.c.column);
              kibiState.save();
            }
          }
        });

      }
    };
  });
});
