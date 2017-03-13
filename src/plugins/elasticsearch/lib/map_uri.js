import querystring from 'querystring';
import { parse as parseUrl } from 'url';
import setHeaders from './set_headers';

export default function mapUri(server, prefix, coordinateAction) {

  const config = server.config();
  return function (request, done) {
    const path = request.path.replace('/elasticsearch', '');
    let url = config.get('elasticsearch.url');
    const { host } = parseUrl(url);
    if (path) {
      if (/\/$/.test(url)) {
        url = url.substring(0, url.length - 1);
      }
      // kibi: replace _search with _msearch to use siren-join when available
      const plugins = config.get('elasticsearch.plugins');
      if (coordinateAction && plugins && plugins.indexOf('siren-join') > -1) {
        var searchInd = path.indexOf('_search') === -1 ? path.indexOf('_msearch') : path.indexOf('_search');
        url += (searchInd !== -1 ? path.slice(0, searchInd) + '_coordinate' + path.slice(searchInd) : path);
      } else {
        url += path;
      }
    }
    const query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    // We want the host of elasticsearch rather than of Kibana
    const headers = {
      ...request.headers,
      host
    };
    const customHeaders = setHeaders(headers, config.get('elasticsearch.customHeaders'));
    done(null, url, customHeaders);
  };
};
