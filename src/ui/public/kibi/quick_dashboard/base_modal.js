import { ModalOverlay } from 'ui/modals/modal_overlay';

import angular from 'angular';
import _ from 'lodash';


export function BaseModalProvider($rootScope, $compile) {
  function bindEscKey(scope) {
    angular.element(document.body).on('keydown', event => {
      if(event.keyCode === 27) { scope.onCancel(); }
    });
  }

  return function baseModalPromise(template, scopeData) {
    const showVars = {};

    const scope = Object.assign($rootScope.$new(), scopeData, {
      onConfirm: _.once(function onConfirm(result) {
        angular.element(document.body).off('keydown');

        showVars.modal.destroy();
        scope.$destroy();

        showVars.resolve(result);
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

          showVars.resolve = resolve;
          showVars.modal = new ModalOverlay(modalWindow);     // Spawns the modal

          bindEscKey(scope);
        });
      }
    };
  };
}
