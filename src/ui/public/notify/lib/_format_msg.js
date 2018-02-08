import { formatESMsg } from 'ui/notify/lib/_format_es_msg';
import { has, get, contains } from 'lodash';
import { RequestFailure } from 'ui/errors'; // siren: added

const errors = {
  RELATIONS_ON_UNAUTHORIZED_DATA: 'one or more relations refer to unauthorized data.',
  VISUALIZATIONS_ON_UNAUTHORIZED_DATA: 'One or more visualizations refer to unauthorized data.',
  SEARCHES_ON_UNAUTHORIZED_DATA: 'One or more saved searches refer to unauthorized data.',
  GENERIC_RELATIONAL_FILTER_ERROR: 'could not load a Relational filter visualization.',
  ENH_VISUALIZATION_ON_UNAUTHORIZED_DATA: 'An Enhanced search results visualization refers to unauthorized data.'
};


/**
 * Formats the error message from an error object, extended elasticsearch
 * object or simple string; prepends optional second parameter to the message
 * @param  {Error|String} err
 * @param  {String} from - Prefix for message indicating source (optional)
 * @returns {string}
 */
export function formatMsg(err, from) {
  let rtn = '';
  if (from) {
    rtn += from + ': ';
  }

  const esMsg = formatESMsg(err);

  if (typeof err === 'string') {
    rtn += err;
  } else if (esMsg) {
    rtn += esMsg;
  } else if (err instanceof Error) {
    rtn += formatMsg.describeError(err);
  } else if (has(err, 'status') && has(err, 'data')) {
    // is an Angular $http "error object"
    if (err.status === -1) {
      // status = -1 indicates that the request was failed to reach the server
      rtn += 'An HTTP request has failed to connect. ' +
             'Please check if the Kibana server is running and that your browser has a working connection, ' +
             'or contact your system administrator.';
    } else {
      if (!err.data) {
        rtn += 'An error occurred while performing a request, please check your connection.';
      } else {
        rtn += 'Error ' + err.status + ' ' + err.statusText + ': ' + err.data.message;
      }
    }
  } else if (has(err, 'options') && has(err, 'response')) {
    // siren: added to handle request-promise errors
    rtn += formatMsg.describeRequestPromiseError(err);
  } else if (has(err, 'reason')) {
    // siren: added to handle certificate errors
    rtn += err.reason;
  }

  if (err instanceof RequestFailure) {
    const status = get(err, 'origError.status', 0);
    if (status === 403) {
      const reason = get(err, 'origError.body.error.reason');
      if (reason) {
        return reason;
      }
      const message = get(err, 'origError.message');
      if (message) {
        return message;
      }
    }
  }

  // siren: modifications to handle authorization errors
  if (!err) {
    return '';
  }
  if (err.body && err.body.error) {
    // Search Guard
    if ((err.body.status === 403 && err.body.error.type === 'security_exception')) {
      switch (from) {
        case 'Siren Relational filter':
          rtn = `${from}: ${errors.RELATIONS_ON_UNAUTHORIZED_DATA}`;
          break;
        case 'Visualize':
          rtn = errors.VISUALIZATIONS_ON_UNAUTHORIZED_DATA;
          break;
        case 'Enhanced search results':
          rtn = errors.ENH_VISUALIZATION_ON_UNAUTHORIZED_DATA;
        default:
          if (from !== 'Courier Fetch Error' && err.message && err.message.search('indices:data/read/coordinate-msearch') !== -1) {
            rtn = errors.SEARCHES_ON_UNAUTHORIZED_DATA;
          }
          break;
      }
    } else if (err.body.status === 500 && err.body.error.type === 'exception' && from === 'Siren Relational filter') {
      rtn = `${from}: ${errors.GENERIC_RELATIONAL_FILTER_ERROR}`;
    }
  } else if (err.data) {
    // Shield or Search Guard
    if (contains(Object.keys(err.data), 'error')) {
      if ((err.data.status === 403 && err.data.error.type === 'security_exception') && from === 'Siren Relational filter') {
        rtn = `${from}: ${errors.RELATIONS_ON_UNAUTHORIZED_DATA}`;
      } else if  (err.data.status === 403 && err.data.error.type === 'security_exception' && from === 'Kibi Navbar helper') {
        rtn = `${from}: ${errors.SEARCHES_ON_UNAUTHORIZED_DATA}`;
      } else if (err.data.status === 500 && err.data.error.type === 'exception' && from === 'Siren Relational filter') {
        rtn = `${from}: ${errors.GENERIC_RELATIONAL_FILTER_ERROR}`;
      }
    }
  } else {
    let message;
    if (err.match) {
      message = err;
    } else {
      message = err.message;
    }
    if (message && message.match(/.*(unauthorized|security_exception|no permissions).*/i)) {
      if (from === 'Visualize') {
        rtn = errors.VISUALIZATIONS_ON_UNAUTHORIZED_DATA;
      } else if (from === 'Enhanced search results') {
        rtn = errors.ENH_VISUALIZATION_ON_UNAUTHORIZED_DATA;
      } else if (from === 'Siren Relational filter') {
        rtn = `${from}: ${errors.RELATIONS_ON_UNAUTHORIZED_DATA}`;
      } else if (message.search('indices:data/read/coordinate-msearch') !== -1 && from !== 'Courier Fetch Error') {
        rtn = errors.SEARCHES_ON_UNAUTHORIZED_DATA;
      } else if (from) {
        rtn = `${from}: ` + message;
      } else {
        rtn = message;
      }
    }
  }

  if (err.path) {
    rtn += ' Triggered while making request to: ' + err.path;
  }
  // siren: end
  return rtn;
}

formatMsg.describeError = function (err) {
  if (!err) return undefined;
  if (err.body && err.body.message) return err.body.message;
  if (err.message) {
    if (err.message === 'unknown error' && (err.statusCode === 0 || err.statusCode === -1)) {
      return 'network error; please check your connection and try again';
    }
    return err.message;
  }
  return '' + err;
};

// siren: added by kibi
formatMsg.describeRequestPromiseError = function (err) {
  let msg = `Error ${err.statusCode}: `;

  if (typeof err.response.body === 'string') {
    msg += err.response.body;
  } else if (err.response.body.message) {
    msg += err.response.body.message;
  }
  return msg;
};
// siren: end
