
import Bluebird from 'bluebird';


/**
 * Takes an array of values and maps it *sequentially* to promises, so
 * that a value is mapped to the corresponding promise only once the
 * previous mapped promise has resolved.
 *
 * This is a shim for Bluebird's Promise.mapSeries, that is available
 * starting from v3.
 *
 * @param {Array}     arr     List of values mapping to promises.
 * @param {Function}  map     Function mapping array values to promises.
 * @return {Promise}          Promise to the array of resolved values.
 */
export function promiseMapSeries(arr, map) {
  return arr.reduce(function (promiseChain, val, idx) {
    return promiseChain
      .then(results => Promise.resolve(map(val, idx))
        .then(res => [...results, res]));
  }, Bluebird.resolve([]));
}
