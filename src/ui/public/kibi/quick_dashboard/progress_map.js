import { QuickDashModalsProvider } from './quickdash_modals';

import { promiseMapSeries } from './commons';
import _ from 'lodash';


export function ProgressMapProvider(Private) {
  const quickDashModals = Private(QuickDashModalsProvider);

  return function progressMap(arr, opts) {
    _.defaults(opts, {
      title: 'In Progress...',
      countMap: _.constant(1)
    });

    const { title } = opts;
    const { valueMap, textMap, countMap } = _(opts)
      .pick(['valueMap', 'textMap', 'countMap'])
      .mapValues(_.iteratee)
      .value();

    const progress = {
      max: _.sum(arr, countMap),
      value: -1,                            // Intended, at first notifyStart => 0
      text: '',
      canceled: false,

      notifyStart(text, count = 1) {
        this.value += count;
        this.text = text;

        return !this.canceled;
      },
    };


    const progressModal = quickDashModals.progress({ title, progress });

    progressModal.scope.onCancel = function () {
      // Overriding cancel - modal shall not hide until
      // current operation finishes
      progress.canceled = true;
      progress.text = 'Canceling...';
    };

    progressModal.show();


    return promiseMapSeries(arr, function (val, idx) {
      return progress.notifyStart(textMap(val, idx)) ?
        valueMap(val, idx, progress) : Promise.reject(0);
    })
    .finally(() => progressModal.scope.onConfirm());
  };
}


