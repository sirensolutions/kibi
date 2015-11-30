var config = require('../config');
var request = require('request');
var querystring = require('querystring');
var express = require('express');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var join = require('path').join;
var logger = require('../lib/logger');
var validateRequest = require('../lib/validateRequest');
var util = require('../lib/sindicetech/util');
var filterJoinSet = require('../lib/sindicetech/filterJoin').set;
var filterJoinSequence = require('../lib/sindicetech/filterJoin').sequence;

var dbfilter = require('../lib/sindicetech/dbfilter');
var inject = require('../lib/sindicetech/inject');
var queryEngine = require('../lib/sindicetech/queryEngine');
var crypto = require('crypto');
var cryptoHelper = require('../lib/sindicetech/crypto_helper');

// Create the router
var router = module.exports = express.Router();

// allow overriding agent for testing purposes
router.proxyTarget = url.parse(config.elasticsearch);
router.proxyAgent = require('../lib/proxyAgent').buildForProtocol(router.proxyTarget.protocol);

// We need to capture the raw body before moving on
router.use(function (req, res, next) {
  var chunks = [];
  req.on('data', function (chunk) {
    chunks.push(chunk);
  });
  req.on('end', function () {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
});


/**
 * Pre-process the query and apply the custom parts of the query
 */
router.use(function (req, res, next) {
  /* Manipulate a set of queries, at the end of which the resulting queries
   * must be concatenated back into a Buffer. The queries in the body are
   * separated by a newline.
   */
  util.getQueriesAsPromise(req.rawBody).map(function (query) {
    return dbfilter(queryEngine, query);
  }).map(function (query) {
    // here detect if it a request to save datasource
    if (req.url.indexOf('/.kibi/datasource/') === 0 && query.datasourceParams && query.datasourceType) {
      cryptoHelper.encryptDatasourceParams(config, query);
    }
    return query;
  }).map(function (query) {
    return filterJoinSet(query);
  }).map(function (query) {
    return filterJoinSequence(query);
  }).then(function (data) {
    var buffers = _.map(data, function (query) {
      return new Buffer(JSON.stringify(query) + '\n');
    });
    req.rawBody = Buffer.concat(buffers);
    next();
  }).catch(function (err) {
    _error(res, err);
  });
});

router.use(function (req, res, next) {
  try {
    validateRequest(req);
    return next();
  } catch (err) {
    logger.error({ req: req }, err.message || 'Bad Request');
    res.status(403).send(err.message || 'Bad Request');
  }
});

function getPort(req) {
  var matches = req.headers.host.match(/:(\d+)/);
  if (matches) return matches[1];
  return req.connection.pair ? '443' : '80';
}

// Create the proxy middleware
router.use(function (req, res, next) {
  var uri = _.defaults({}, router.proxyTarget);

  // Add a slash to the end of the URL so resolve doesn't remove it.
  var path = (/\/$/.test(uri.path)) ? uri.path : uri.path + '/';

  // kibi: removed the dot to avoid issue with Elasticsearch running  behind a
  // proxy
  // path = url.resolve(path, '.' + req.url);
  path = url.resolve(path, req.url);

  if (uri.auth) {
    var auth = new Buffer(uri.auth);
    req.headers.authorization = 'Basic ' + auth.toString('base64');
  }

  // kibi: replace _search with _msearch to use FilterJoinPlugin when available
  var elasticsearch_url = config.elasticsearch;
  if (config.elasticsearch_plugins.indexOf('FilterJoinPlugin') > -1) {
    var searchInd = path.indexOf('_search') === -1 ? path.indexOf('_msearch') : path.indexOf('_search');
    elasticsearch_url += (searchInd !== -1 ? path.slice(0, searchInd) + '_coordinate' + path.slice(searchInd) : path);
  } else {
    elasticsearch_url += path;
  }

  var options = {
    agent: router.proxyAgent,
    url: elasticsearch_url,
    //url: uri.protocol + '//' + uri.host + path,
    method: req.method,
    headers: _.defaults({}, req.headers),
    strictSSL: config.kibana.verify_ssl,
    timeout: config.request_timeout
  };

  options.headers['x-forward-for'] = req.connection.remoteAddress || req.socket.remoteAddress;
  options.headers['x-forward-port'] = getPort(req);
  options.headers['x-forward-proto'] = req.connection.pair ? 'https' : 'http';

  var savedQueries = {};
  // Only send the body if it's a PATCH, PUT, or POST
  if (req.rawBody) {
    // Remove the custom queries from the body
    var queries = _.map(util.getQueries(req.rawBody), function (query) {
      savedQueries = inject.save(query);
      return new Buffer(JSON.stringify(query) + '\n');
    });
    req.rawBody = Buffer.concat(queries);
    if (logger.level() <= 20) {
      var dbgQueries = _.map(util.getQueries(req.rawBody), function (query) {
        return query;
      });
      logger.debug({ queries: dbgQueries });
    }

    options.headers['content-length'] = req.rawBody.length;
    options.body = req.rawBody.toString('utf8');
  } else {
    options.headers['content-length'] = 0;
  }

  // To support the elasticsearch_preserve_host feature we need to change the
  // host header to the target host header. I don't quite understand the value
  // of this... but it's a feature we had before so I guess we are keeping it.
  if (config.kibana.elasticsearch_preserve_host) {
    options.headers.host = router.proxyTarget.host;
  }

  // Create the request and pipe the response
  var chunks = [];
  var esRequest = request(options);
  esRequest.on('error', function (err) {
    _error(res, err);
  }).on('response', function (response) {
    // Copy the headers
    _.each(response.headers, function (v, k) {
      res.setHeader(k, v);
    });
    // Set the status code
    res.statusCode = response.statusCode;
  }).on('data', function (data) {
    // buffers the chunks of data
    chunks.push(data);
  }).on('end', function () {
    // Modify the response if necessary
    var data = Buffer.concat(chunks);
    if (data.length !== 0) {
      inject.runSavedQueries(JSON.parse(data.toString()), queryEngine, savedQueries)
      .then(function (r) {
        data = new Buffer(JSON.stringify(r));
        res.setHeader('Content-Length', data.length);
        res.end(data);
      }).catch(function (err) {
        _error(res, err);
      });
    } else {
      res.end(data);
    }
  });
});

/**
 * Set the http error
 */
function _error(res, err) {
  logger.error({ err: err });
  var code = 502;
  var body = { message: 'Bad Gateway' };

  if (err.code === 'ECONNREFUSED') {
    body.message = 'Unable to connect to Elasticsearch';
  }

  if (err.message === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    body.message = 'SSL handshake with Elasticsearch failed';
  }

  body.err = err.message;
  if (!res.headersSent) res.status(code).json(body);
}
