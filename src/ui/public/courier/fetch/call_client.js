import _ from 'lodash';

import IsRequestProvider from './is_request';
import MergeDuplicatesRequestProvider from './merge_duplicate_requests';
import ReqStatusProvider from './req_status';
import uniqFilters from 'ui/filter_bar/lib/uniq_filters';

export default function CourierFetchCallClient(Private, Promise, esAdmin, es) {

  const isRequest = Private(IsRequestProvider);
  const mergeDuplicateRequests = Private(MergeDuplicatesRequestProvider);

  const ABORTED = Private(ReqStatusProvider).ABORTED;
  const DUPLICATE = Private(ReqStatusProvider).DUPLICATE;

  function callClient(strategy, requests) {
    // merging docs can change status to DUPLICATE, capture new statuses
    const statuses = mergeDuplicateRequests(requests);

    // get the actual list of requests that we will be fetching
    const executable = statuses.filter(isRequest);
    let execCount = executable.length;

    if (!execCount) return Promise.resolve([]);

    // resolved by respond()
    let esPromise;
    const defer = Promise.defer();

    // for each respond with either the response or ABORTED
    const respond = function (responses) {
      responses = responses || [];
      return Promise.map(requests, function (req, i) {
        switch (statuses[i]) {
          case ABORTED:
            return ABORTED;
          case DUPLICATE:
            return req._uniq.resp;
          default:
            return responses[_.findIndex(executable, req)];
        }
      })
      .then(
        (res) => defer.resolve(res),
        (err) => defer.reject(err)
      );
    };


    // handle a request being aborted while being fetched
    const requestWasAborted = Promise.method(function (req, i) {
      if (statuses[i] === ABORTED) {
        defer.reject(new Error('Request was aborted twice?'));
      }

      execCount -= 1;
      if (execCount > 0) {
        // the multi-request still contains other requests
        return;
      }

      if (esPromise && _.isFunction(esPromise.abort)) {
        esPromise.abort();
      }

      esPromise = ABORTED;

      return respond();
    });


    // attach abort handlers, close over request index
    statuses.forEach(function (req, i) {
      if (!isRequest(req)) return;
      req.whenAborted(function () {
        requestWasAborted(req, i).catch(defer.reject);
      });
    });


    // Now that all of THAT^^^ is out of the way, lets actually
    // call out to elasticsearch
    Promise.map(executable, function (req) {
      return Promise.try(req.getFetchParams, void 0, req)
      .then(function (fetchParams) {
        return (req.fetchParams = fetchParams);
      });
    })
    .then(function (reqsFetchParams) {
      // kibi: call to requestAdapter function of the related visualization
      reqsFetchParams.forEach(function (req) {
        // If the request is a default wildcard query
        // convert it to a match_all (and if there is another match_all, dedupe)
        if (req.body && req.body.query && req.body.query.bool && req.body.query.bool.must) {
          req.body.query.bool.must = uniqFilters(req.body.query.bool.must.map(query => {
            if (_.isEqual(query, { query_string: { query: "*", analyze_wildcard: true } })) {
              query = { match_all: {} };
            }

            return query;
          }));
        }

        if (req.getSource) {
          const source = req.getSource();
          if (source && source.vis && source.vis.requestAdapter) {
            source.vis.requestAdapter(req);
          }
        }
      });
     // kibi: end
      return strategy.reqsFetchParamsToBody(reqsFetchParams);
    })
    .then(function (body) {
      // while the strategy was converting, our request was aborted
      if (esPromise === ABORTED) {
        throw ABORTED;
      }

      // kibi: if the strategy provides a client use it instead of the default one.
      const id = strategy.id;
      let client = (id && id.includes('admin')) ? esAdmin : es;
      client = strategy.client ? strategy.client : client;
      return (esPromise = client[strategy.clientMethod]({ body }));
      // kibi: end

    })
    .then(function (clientResp) {
      return strategy.getResponses(clientResp);
    })
    .then(respond)
    .catch(function (err) {
      if (err === ABORTED) respond();
      else defer.reject(err);
    });

    // return our promise, but catch any errors we create and
    // send them to the requests
    return defer.promise
    .catch(function (err) {
      requests.forEach(function (req, i) {
        if (statuses[i] !== ABORTED) {
          req.handleFailure(err);
        }
      });
    });

  }

  return callClient;
}
