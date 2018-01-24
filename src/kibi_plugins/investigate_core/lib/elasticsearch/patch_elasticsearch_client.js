/**
 * Patches the Elasticsearch client class to expose the following methods globally:
 *
 * - siren_search: method that sends an msearch request to siren/_search
 * - siren_msearch method that sends an msearch request to siren/_msearch
 * - investigate_search: wrapper around siren_search that applies transformations
 *                       functions exposed by the Elasticsearch plugin.
 * - vanguard_search: alias of siren_search for backward compatibility
 * - vanguard_msearch: alias of siren_msearch for backward compatibility
 * - coordinate_search: alias of vanguard_search kept for backward compatibility
 * - coordinate_msearch: alias of vanguard_msearch kept for backward compatibility
 * - kibi_search: alias of investigate_search for backward compatibility.
 *
 * @param {Server} server - A server instance.
 */
export function patchElasticsearchClient(server) {

  const config = server.config();

  // NOTE:
  // At this moment the default client does not exist yet so there is no way to check
  // that the Federate plugin is actually installed.
  // The methods are exposed and if the plugin is not installed the calls will fail
  // with an error from elasticsearch.
  const _ = require('lodash');
  const elasticsearch = require('elasticsearch');
  const clientAction = require('elasticsearch/src/lib/client_action');
  const utils = require('elasticsearch/src/lib/utils');
  const apiVersion = config.get('elasticsearch.apiVersion');
  const transformSearchRequest = server.plugins.elasticsearch.transformSearchRequest;
  const transformSearchResponse = server.plugins.elasticsearch.transformSearchResponse;

  const ca = clientAction.makeFactoryWithModifier(function (spec) {
    return utils.merge(spec, {
      params: {
        filterPath: {
          type: 'list',
          name: 'filter_path'
        }
      }
    });
  });

  const addSirenPrefixToUrls = function (urls) {
    for (let i = 0; i < urls.length; i++) {
      const fmtURL = urls[i].fmt;
      if (fmtURL) {
        if (_.endsWith(fmtURL, '_search') || _.endsWith(fmtURL, '_msearch')) {
          urls[i].fmt = '/siren' + fmtURL;
        }
      }
    }
  };

  const sirenSearchSpec = _.cloneDeep(elasticsearch.Client.apis[apiVersion].search.spec);
  addSirenPrefixToUrls(sirenSearchSpec.urls);
  elasticsearch.Client.apis[apiVersion].siren_search = ca(sirenSearchSpec);

  const sirenMsearchSpec = _.cloneDeep(elasticsearch.Client.apis[apiVersion].msearch.spec);
  addSirenPrefixToUrls(sirenMsearchSpec.urls);
  elasticsearch.Client.apis[apiVersion].siren_msearch = ca(sirenMsearchSpec);

  elasticsearch.Client.apis[apiVersion].investigate_search = function () {
    const options = arguments[0];
    if (options && options.body) {
      return transformSearchRequest(options.body)
        .then(({ search, savedQueries }) => {
          return this.siren_search(...arguments)
            .then((response) => transformSearchResponse(response, savedQueries));
        });
    } else {
      return this.siren_search(...arguments);
    }
  };

  // keep aliases for backward compatibility
  elasticsearch.Client.apis[apiVersion].vanguard_search = elasticsearch.Client.apis[apiVersion].siren_search;
  elasticsearch.Client.apis[apiVersion].vanguard_msearch = elasticsearch.Client.apis[apiVersion].siren_msearch;
  elasticsearch.Client.apis[apiVersion].coordinate_search = elasticsearch.Client.apis[apiVersion].siren_search;
  elasticsearch.Client.apis[apiVersion].coordinate_msearch = elasticsearch.Client.apis[apiVersion].siren_msearch;
  elasticsearch.Client.apis[apiVersion].kibi_search = elasticsearch.Client.apis[apiVersion].investigate_search;

}
