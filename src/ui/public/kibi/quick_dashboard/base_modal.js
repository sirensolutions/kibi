import { ModalOverlay } from 'ui/modals/modal_overlay';

import angular from 'angular';


export function BaseModalProvider($rootScope, $compile) {
  function assignEventHandlers(scope, modal, resolve) {
    Object.assign(scope, {
      destroy() {
        angular.element(document.body).off('keydown');

        modal.destroy();
        this.$destroy();
      },

      onConfirm(result) {
        this.destroy();
        resolve(result);
      },

      onCancel() {
        this.destroy();
        resolve(null);
      }
    });

    angular.element(document.body).on('keydown', (event) => {
      if(event.keyCode === 27) { scope.onCancel(); }
    });
  }

  return function baseModalPromise(template, scopeData) {
    return new Promise(function baseModal(resolve) {
      const scope = Object.assign($rootScope.$new(), scopeData);

      const modalWindow = $compile(template)(scope);
      const modal = new ModalOverlay(modalWindow);

      assignEventHandlers(scope, modal, resolve);
    });
  };
}
