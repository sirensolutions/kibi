import { contains, defaults, omit, trimLeft, trimRight } from 'lodash';
import { parse as parseUrl, format as formatUrl } from 'url';
import filterHeaders from './filter_headers';
import setHeaders from './set_headers';

// kibi: server and sirenAction added for
// replacing '_search' with '_msearch' to use siren-federate when available

export default function mapUri(cluster, proxyPrefix, server, sirenAction) {
  const serverConfig = server.config();

  function joinPaths(pathA, pathB) {
    return trimRight(pathA, '/') + '/' + trimLeft(pathB, '/');
  }

  return function (request, done) {
    const elasticsearchPlugins = serverConfig.get('investigate_core.clusterplugins');
    const {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort,
      pathname: esUrlBasePath,
      query: esUrlQuery
    } = parseUrl(cluster.getUrl(), true);

    // copy most url components directly from the elasticsearch.url
    const mappedUrlComponents = {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort
    };

    // pathname
    const reqSubPath = request.path.replace(proxyPrefix, '');
    mappedUrlComponents.pathname = joinPaths(esUrlBasePath, reqSubPath);

    // kibi: replace _search with _msearch to use siren-federate when available
    if (sirenAction && elasticsearchPlugins && (contains(elasticsearchPlugins, 'siren-federate') ||
        contains(elasticsearchPlugins, 'siren-vanguard'))) {
      if (!reqSubPath.startsWith('/_siren/') && (reqSubPath.endsWith('_search') || reqSubPath.endsWith('_msearch'))) {
        mappedUrlComponents.pathname = joinPaths(esUrlBasePath, `siren/${trimLeft(reqSubPath, '/')}`);
      }
    }
    // kibi: end

    // kibi: remove request parameters used only for differentiating requests
    const requestQuery = request.query;
    if (requestQuery) {
      delete requestQuery.getMeta;
      delete requestQuery.getEntitiesFromDashboard;
    }
    // kibi: end

    // querystring
    const mappedQuery = defaults(omit(requestQuery, '_'), esUrlQuery);
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const filteredHeaders = filterHeaders(request.headers, cluster.getRequestHeadersWhitelist());
    const mappedHeaders = setHeaders(filteredHeaders, cluster.getCustomHeaders());
    const mappedUrl = formatUrl(mappedUrlComponents);
    done(null, mappedUrl, mappedHeaders);
  };
}
