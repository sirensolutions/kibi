var querystring = require('querystring');
var resolve = require('url').resolve;
module.exports = function mapUri(server, prefix, coordinateAction) {
  var config = server.config();
  return function (request, done) {
    var path = request.path.replace('/elasticsearch', '');
    var url = config.get('elasticsearch.url');
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
    var query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    done(null, url);
  };
};
