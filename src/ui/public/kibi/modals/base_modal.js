import { ModalOverlay } from 'ui/modals/modal_overlay';

import angular from 'angular';
import _ from 'lodash';


export function BaseModalProvider($rootScope, $compile, $timeout) {
  function bindEscKey(scope) {
    angular.element(document.body).on('keydown', event => {
      if(event.keyCode === 27) { scope.onCancel(); }
    });
  }

  return function baseModalPromise(template, scopeData) {
    const scope = Object.assign($rootScope.$new(), scopeData, {
      onConfirm: _.once(function onConfirm(result) {
        const { resolve } = scope;

        angular.element(document.body).off('keydown');

        scope.modal.destroy();
        scope.$destroy();

        resolve(result);
      }),

      onCancel() {
        scope.onConfirm(null);
      }
    });

    return {
      scope,

      show() {
        return new Promise(function show(resolve) {
          const modalWindow = $compile(template)(scope);

          $timeout(() => {                                      // Wait element rendering
            scope.resolve = resolve;
            scope.modal = new ModalOverlay(modalWindow);        // Spawns the modal

            bindEscKey(scope);
          });
        });
      }
    };
  };
}
