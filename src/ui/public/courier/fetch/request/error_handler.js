import Notifier from 'ui/notify/notifier';

import ErrorHandlersProvider from '../../_error_handlers';

export default function RequestErrorHandlerFactory(Private) {
  const errHandlers = Private(ErrorHandlersProvider);

  const notify = new Notifier({
    location: 'Courier Fetch Error'
  });

  function handleError(req, error) {
    const myHandlers = [];

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
}
