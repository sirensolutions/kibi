define(function (require) {
  return function RequestErrorHandlerFactory(Private, createNotifier) {
    let errHandlers = Private(require('ui/courier/_error_handlers'));

    let notify = createNotifier({
      location: 'Courier Fetch Error'
    });

    function handleError(req, error) {
      let myHandlers = [];

      errHandlers.splice(0).forEach(function (handler) {
        (handler.source === req.source ? myHandlers : errHandlers).push(handler);
      });

      if (!myHandlers.length) {

        // kibi: changed from nutify.fatal to notify.error to avoid the screen of death
        notify.error(new Error(`unhandled courier request error: ${ notify.describeError(error) }`));
        // kibi: end

      } else {
        myHandlers.forEach(function (handler) {
          handler.defer.resolve(error);
        });
      }
    }

    return handleError;
  };
});
