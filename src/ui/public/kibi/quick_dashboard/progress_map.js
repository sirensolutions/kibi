import { QuickDashModalsProvider } from './quickdash_modals';

import { promiseMapSeries } from './commons';
import _ from 'lodash';

import './progress_modal.less';


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

    const startTime = Date.now();

    const max = _.sum(arr, countMap);
    let value = -1;                               // Intended, at first notifyStart => 0
    let text = '';
    let canceled = false;

    const progress = {
      get max() { return max; },
      get value() { return value; },
      get text() { return text; },
      get canceled() { return canceled; },

      notifyStart(text_, count = 1) {
        value += count;
        text = text_;

        return !canceled;
      },

      eta: _.throttle(function eta() {
        if(value <= 0) { return '--:--:--'; }

        let time = (max - value) * (Date.now() - startTime) / value;
        time = Math.floor(time * 1e-3);

        let ss = time % 60;
        time = Math.round((time - ss) / 60);
        ss = _.padLeft('' + ss, 2, '0');

        let mm = time % 60;
        time = Math.round((time - mm) / 60);
        mm = _.padLeft('' + mm, 2, '0');

        return `${time}:${mm}:${ss}`;
      }, 400),

      percentCompletion() {
        return Math.floor(100 * value / max);
      }
    };


    const progressModal = quickDashModals.progress({ title, progress });

    progressModal.scope.onCancel = function () {
      // Overriding cancel - modal shall not hide until
      // current operation finishes
      canceled = true;
      text = 'Canceling...';
    };

    progressModal.show();


    return promiseMapSeries(arr, function (val, idx) {
      return progress.notifyStart(textMap(val, idx)) ?
        valueMap(val, idx, progress) : Promise.reject(0);
    })
    .finally(() => progressModal.scope.onConfirm());
  };
}


