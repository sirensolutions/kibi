import _ from 'lodash';

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export default function formatESMsg(err) {
  // kibi: $http store the response in data
  const rootCause = _.get(err, 'resp.error.root_cause') || _.get(err, 'data.error.root_cause');
  if (!rootCause) {
    return; //undefined
  }

  const result = _.pluck(rootCause, 'reason').join('\n');
  return result;
}
