import _ from 'lodash';
import { uiModules } from 'ui/modules';
import indexOptionsTemplate from './index_options.html';
import './index_options.less';


uiModules.get('apps/management')
.directive('indexOptions', function ($compile, Private, ontologyClient, kbnUrl, createNotifier) {
  return {
    restrict: 'E',
    template: indexOptionsTemplate,
    scope: {
      entity: '=',
      save: '='
    },
    link: function ($scope) {
      const indexOptionsHelpers = Private(require('./helpers/index_options_helper'));

      const addLabelPreviewPopup = function () {
        var result = document.getElementsByClassName('label-preview');
        const $el = angular.element(result);
        $el.qtip('destroy', true);
        const api = $el.qtip('api');
        // build html content
        indexOptionsHelpers.getInstanceLabelPreviewContent($scope.entity)
        .then((html) =>{
          if (api) {
            api.set('content.text', html);
          } else {
            $el.qtip({
              content: {
                text: html,
              },
              position: {
                my: 'left center',
                at: 'right center'
              },
              hide: {
                event: 'unfocus click'
              },
              show: 'click',
              style: {
                classes: 'qtip-light qtip-rounded qtip-shadow entity-label-preview'
              }
            });
          }
          $compile(html)($scope);
        })
      };

      $scope.save = function () {
        let promise;
        if ($scope.entity.type === 'VIRTUAL_ENTITY') {
          promise = ontologyClient.updateEntity($scope.entity);
        } else {
          const entity = indexOptionsHelpers.getEntityForUpdate($scope.entity);
          promise = ontologyClient.updateEntity(entity);
        }

        return Promise.resolve(promise)
        .then(() => {
          kbnUrl.change('/management/siren/entities/' + $scope.entity.id);
        });
      };

      // Init the preview menu
      if ($scope.entity) {
        addLabelPreviewPopup();
      }

      $scope.$watch('entity.instanceLabel.value', () => {
        addLabelPreviewPopup();
      })
    }
  };
});
