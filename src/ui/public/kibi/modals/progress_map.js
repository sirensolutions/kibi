import { BaseModalProvider } from './base_modal';

import progressTemplate from './progress_modal.html';
import './progress_modal.less';

import { promiseMapSeries } from 'ui/kibi/utils/promise';
import _ from 'lodash';


/** @class Progress
 * @property {Number}   max           Total number of progress steps
 * @property {Number}   value         Current progress step
 * @property {String}   text          Progress text
 * @property {Boolean}  canceled      Whether execution has been canceled
 */

/** @method Progress#notifyStart
 *
 * @description
 * Advances the progress bar and sets the specified text for display.
 * The return value is {@see Progress#canceled}, provided for convenience.
 *
 * @param {String}      text          New progress text
 * @param {Number}      [count=1]     Incremented steps
 * @return {Boolean}                  Whether the progress can continue
 */

/** @method Progress#updateMax
 *
 * @description
 * In case the overall progresses max count changes in progress,
 * this method can be called to refresh it.
 *
 * The update will take place at the end of current operation.
 */

/** @function progressMap
 *
 * @description
 * Takes an array of values or promises and *sequentially*
 * maps them into promises, while detailing progress with
 * a modal progress bar.
 *
 * @param {Array} arr
 *    List of values to be mapped and tracked for progress
 *
 * @param {Object} opts
 *    Keyword arguments
 *
 * @param {Function} opts.title
 *    Title for the progress bar modal
 *
 * @param {Function} opts.valueMap
 *    Map from input value to output value. Supplied parameters
 *    are the input value, its index, and the {@link Progress}
 *    context.
 *
 * @param {Function} opts.stepMap
 *    Map from input value to the expected progress step:
 *
 *     - The progress text to show, progress is incremented automatically as a unit.
 *     - The expected number of progresses, to be incremented manually using
 *       {@see Progress#notifyStart}.
 *
 * @return {Promise[]}
 *    The mapped values, according to the valueMap.
 */

export function ProgressMapProvider(Private) {
  const baseModal = Private(BaseModalProvider);

  return function progressMap(arr, opts) {
    _.defaults(opts, {
      title: 'In Progress...'
    });

    const { title } = opts;
    const { valueMap, stepMap } = _(opts)
      .pick(['valueMap', 'stepMap'])
      .mapValues(_.iteratee)
      .value();

    function countMap(val, idx) {
      val = stepMap(val, idx);
      return _.isString(val) ? 1 : val;
    }

    const startTime = Date.now();

    let max = _.sum(arr, countMap);
    let value = -1;                               // Intended, at first notifyStart => 0
    let text = '';
    let canceled = false;
    let updateMax = false;

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
      },

      updateMax() {
        updateMax = true;
      }
    };


    const progressModal = baseModal(progressTemplate, { title, progress });

    progressModal.scope.onCancel = function () {
      // Overriding cancel - modal shall not hide until
      // current operation finishes
      canceled = true;
      text = 'Canceling...';
    };

    progressModal.show();


    return promiseMapSeries(arr, function (val, idx) {
      const step = stepMap(val, idx);

      if(_.isString(step) && !progress.notifyStart(step)) {
        return Promise.reject();
      }

      return Promise.resolve(valueMap(val, idx, progress))
        .then(ret => {
          if(updateMax) {
            updateMax = false;
            max = Math.min(value + _(arr).slice(idx).sum(countMap), max);
          }

          return ret;
        });
    })
    .finally(() => progressModal.scope.onConfirm());
  };
}


