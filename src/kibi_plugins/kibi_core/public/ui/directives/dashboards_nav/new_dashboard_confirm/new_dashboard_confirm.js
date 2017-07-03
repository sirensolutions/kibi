import angular from 'angular';
import { noop } from 'lodash';
import 'ui/kibi/directives/kibi_select';
import 'ui/directives/info';
import { ModalOverlay } from 'ui/modals/modal_overlay';
import './new_dashboard_confirm.less';
import template from './new_dashboard_confirm.html';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.factory('newDashboardConfirm', function ($rootScope, $compile) {
  let modalPopover;
  const confirmQueue = [];

  return function confirmModal(title, customOptions) {
    const defaultOptions = {
      onCancel: noop,
      cancelButtonText: 'Cancel',
      showClose: false
    };
    if (!customOptions.onConfirm) {
      throw new Error('Please specify confirmation button text and onConfirm action');
    }

    const options = Object.assign(defaultOptions, customOptions);

    // Special handling for onClose - if no specific callback was supplied, default to the
    // onCancel callback.
    options.onClose = customOptions.onClose || options.onCancel;

    const confirmScope = $rootScope.$new();

    confirmScope.title = title;
    confirmScope.savedSearchId = '';
    confirmScope.onConfirm = () => {
      destroy();
      options.title = confirmScope.title;
      options.savedSearchId = confirmScope.savedSearchId;
      options.onConfirm(options);
    };
    confirmScope.onCancel = () => {
      destroy();
      options.onCancel();
    };
    confirmScope.onClose = () => {
      destroy();
      options.onClose();
    };
    confirmScope.savedSearchDescription = () => {
      return !confirmScope.savedSearchId ? 'NONE' : confirmScope.savedSearchId;
    };

    function showModal(confirmScope) {
      const modalInstance = $compile(template)(confirmScope);
      modalPopover = new ModalOverlay(modalInstance);
      angular.element(document.body).on('keydown', (event) => {
        if (event.keyCode === 27) {
          confirmScope.onCancel();
        }
      });

      modalInstance.find('[data-test-subj=confirmModalConfirmButton]').focus();
    }

    if (modalPopover) {
      confirmQueue.unshift(confirmScope);
    } else {
      showModal(confirmScope);
    }

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      angular.element(document.body).off('keydown');
      confirmScope.$destroy();

      if (confirmQueue.length > 0) {
        showModal(confirmQueue.pop());
      }
    }
  };
});
