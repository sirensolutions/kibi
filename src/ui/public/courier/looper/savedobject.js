import { FetchProvider } from 'ui/courier/fetch/fetch';
import { LooperProvider } from 'ui/courier/looper/_looper';
import FetchStrategyForSavedObject from 'ui/courier/fetch/strategy/savedobject';

export function SavedObjectLooperService(Private) {
  const fetch = Private(FetchProvider);
  const Looper = Private(LooperProvider);
  const strategy = Private(FetchStrategyForSavedObject);

  /**
   * The Looper which will manage the saved objects fetch interval
   * @type {Looper}
   */
  return new Looper(1500, function () {
    fetch.fetchQueued(strategy);
  });
};
