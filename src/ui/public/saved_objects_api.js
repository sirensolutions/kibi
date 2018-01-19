import 'elasticsearch-browser/elasticsearch.angular.js';
import _ from 'lodash';
import { uiModules } from 'ui/modules';

let client;

uiModules
.get('kibana', ['elasticsearch', 'kibana/config'])
.service('savedObjectsAPI', function (esFactory, savedObjectsAPIUrl, $q, esApiVersion, esRequestTimeout) {
  if (client) return client;

  client = esFactory({
    host: savedObjectsAPIUrl,
    log: 'error',
    requestTimeout: esRequestTimeout,
    apiVersion: esApiVersion,
    plugins: [function (Client, config) {

      // esFactory automatically injects the AngularConnector to the config
      // https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/angular.js
      _.class(CustomAngularConnector).inherits(config.connectionClass);
      function CustomAngularConnector(host, config) {
        CustomAngularConnector.Super.call(this, host, config);

        this.request = _.wrap(this.request, function (request, params, cb) {
          if (String(params.method).toUpperCase() === 'GET') {
            params.query = _.defaults({ _: Date.now() }, params.query);
          }

          return request.call(this, params, cb);
        });
      }

      config.connectionClass = CustomAngularConnector;
    }]
  });

  return client;
});
