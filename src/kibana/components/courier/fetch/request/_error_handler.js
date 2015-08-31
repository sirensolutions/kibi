define(function (require) {
  return function RequestErrorHandlerFactory(Private, Notifier) {
    var errHandlers = Private(require('components/courier/_error_handlers'));

    var notify = new Notifier({
      location: 'Courier Fetch Error'
    });

    function handleError(req, error) {
      var myHandlers = [];

      errHandlers.splice(0).forEach(function (handler) {
        (handler.source === req.source ? myHandlers : errHandlers).push(handler);
      });

      if (!myHandlers.length) {

        // changed by sindicetech from nutify.fatal to notify.error to avoid the screen of death
        // added body if exists to handle the case when db query cause elastic search request to fail
        var body = error.body ? JSON.stringify(error.body, null, ' ') : '';
        notify.error(new Error('unhandled error: ' + body + (error.stack || error.message)));
        // sindicetech end
      } else {
        myHandlers.forEach(function (handler) {
          handler.defer.resolve(error);
        });
      }
    }

    return handleError;
  };
});