import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import angular from 'angular';
import { toJson } from 'ui/utils/aggressive_parse';
import translateJoinQueryTemplate from '../partials/translate_join_query.html';
import '../styles/translate_join_query.less';

const app = uiModules.get('kibana');
app.directive('translateJoinQuery', function ($http) {
  return {
    template: translateJoinQueryTemplate,
    scope: true,
    controller: function ($scope) {

      $scope.aceLoaded = function (editor) {
        $scope.editor = editor;
      };

      $scope.translate = function () {
        $http.post(chrome.getBasePath() + '/translateToES', JSON.parse($scope.rawQuery))
        .then(result => {
          $scope.editor.setValue(JSON.stringify(result.data.translatedQuery, null, 2));
        });
      };

    }
  };
});
