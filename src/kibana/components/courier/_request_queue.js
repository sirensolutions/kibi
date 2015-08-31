define(function (require) {
  return function PendingRequestList() {
    var _ = require('lodash');

    /**
     * Queue of pending requests, requests are removed as
     * they are processed by fetch.[sourceType]().
     * @type {Array}
     */
    var queue = [];

    queue.getInactive = function (/* strategies */) {
      return queue.get.apply(queue, arguments)
      .filter(function (req) {
        return !req.started && req.source._disabled !== true;
      });
    };

    queue.get = function (/* strategies.. */) {
      var strategies = _.toArray(arguments);

      var filtered =  queue.filter(function (req) {
        var strategyMatch = !strategies.length;
        if (!strategyMatch) {
          strategyMatch = strategies.some(function (strategy) {
            return req.strategy === strategy;
          });
        }
        // sindicetech special flag req.source.inactive added to filter out requests from inactive source
        return strategyMatch && req.canStart() && req.source._disabled !== true;
      });

      return filtered;
    };


    // added by sindicetech
    queue.markAllRequestsWithSourceIdAsInactive = function (_id) {
      // iterate backwords so when we remove 1 item we do not care about the length being changed
      var n = queue.length - 1;
      for (var i = n; i >= 0; i--) {
        var r = queue[i];
        if (r && r.source && r.source._id === _id) {
          // mark source as inactive
          r.source._disabled = true;
          // remove the request from queue
          queue.splice(i, 1);
        }
      }
    };
    // sindicetech end


    return queue;
  };
});
