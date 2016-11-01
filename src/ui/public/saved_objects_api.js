define(function (require) {
  require('elasticsearch-browser/elasticsearch.angular.js');
  var _ = require('lodash');

  var client;
  require('ui/modules')
  .get('kibana', ['elasticsearch', 'kibana/config'])
  .service('savedObjectsAPI', function (esFactory, savedObjectsAPIUrl, $q, esApiVersion, esRequestTimeout) {
    if (client) return client;

    client = esFactory({
      host: savedObjectsAPIUrl,
      log: 'info',
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
});
