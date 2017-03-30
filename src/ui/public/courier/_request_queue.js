import _ from 'lodash';
export default function PendingRequestList() {

  /**
   * Queue of pending requests, requests are removed as
   * they are processed by fetch.[sourceType]().
   * @type {Array}
   */
  const queue = [];

  queue.getInactive = function (/* strategies */) {
    return queue.get.apply(queue, arguments)
    .filter(function (req) {
      // kibi: added req.source._disabled !== true
      // _disabled is a special flag added by _request_queue_wrapped.markAllRequestsWithSourceIdAsInactive
      return !req.started && req.source._disabled !== true;
    });
  };

  queue.getStartable = function (...strategies) {
    // kibi: added this.source._disabled !== true
    // _disabled is a special flag added by _request_queue_wrapped.markAllRequestsWithSourceIdAsInactive
    return queue.get(...strategies).filter(req => req.canStart() && req.source._disabled !== true);
  };

  queue.get = function (...strategies) {
    return queue.filter(function (req) {
      let strategyMatch = !strategies.length;
      if (!strategyMatch) {
        strategyMatch = strategies.some(function (strategy) {
          return req.strategy === strategy;
        });
      }

      // kibi: added this.source._disabled !== true
      // _disabled is a special flag added by _request_queue_wrapped.markAllRequestsWithSourceIdAsInactive
      return strategyMatch && !req.source._disabled;
    });
  };

  return queue;
};
