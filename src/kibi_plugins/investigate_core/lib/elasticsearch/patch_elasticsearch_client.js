/**
 * Patches the Elasticsearch client class to expose the following methods globally:
 *
 * - vanguard_search: Vanguard _search version
 * - vanguard_msearch Vanguard _msearch version
 * - coordinate_search: alias to vanguard_search kept for backward compatibility
 * - coordinate_msearch: alias for vanguard_msearch kept for backward compatibility
 * - kibi_search: wrapper around Vanguard _search that applies transformations
 *                functions exposed by the Elasticsearch plugin.
 *
 * @param {Server} server - A server instance.
 */
export function patchElasticsearchClient(server) {

  const config = server.config();

  // NOTE:
  // At this moment the default client does not exist yet so there is no way to check
  // that the Vanguard plugin is actually installed.
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
  elasticsearch.Client.apis[apiVersion].vanguard_search = ca(sirenSearchSpec);

  const sirenMsearchSpec = _.cloneDeep(elasticsearch.Client.apis[apiVersion].msearch.spec);
  addSirenPrefixToUrls(sirenMsearchSpec.urls);
  elasticsearch.Client.apis[apiVersion].vanguard_msearch = ca(sirenMsearchSpec);

  // keep aliases for backward compatibility
  elasticsearch.Client.apis[apiVersion].coordinate_search = elasticsearch.Client.apis[apiVersion].vanguard_search;
  elasticsearch.Client.apis[apiVersion].coordinate_msearch = elasticsearch.Client.apis[apiVersion].vanguard_msearch;

  elasticsearch.Client.apis[apiVersion].kibi_search = function () {
    const options = arguments[0];
    if (options && options.body) {
      return transformSearchRequest(options.body)
      .then(({ search, savedQueries }) => {
        return this.vanguard_search(...arguments)
        .then((response) => transformSearchResponse(response, savedQueries));
      });
    } else {
      return this.vanguard_search(...arguments);
    }
  };

}
