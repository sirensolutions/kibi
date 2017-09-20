import './new_dashboard_confirm';
import { uiModules } from 'ui/modules';
import 'ui/modals';

const module = uiModules.get('kibana');

module.factory('newDashboardConfirmPromise', function (Promise, newDashboardConfirm) {
  return (title, customOptions) => new Promise((resolve, reject) => {
    const defaultOptions = {
      onConfirm: resolve,
      onCancel: reject
    };
    const options = Object.assign(defaultOptions, customOptions);
    newDashboardConfirm(title, options);
  });
});
