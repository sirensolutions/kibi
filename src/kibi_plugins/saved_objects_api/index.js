import initRegistry from './lib/init_registry';

/**
 * Saved objects API plugin.
 *
 * This plugin provides an API to perform crud operations on saved objects.
 *
 * Might be superseded by https://github.com/elastic/kibana/issues/5480 at some point.
 *
 * The plugin exposes the following methods:
 *
 * `registerType(typeName, schema)`: allows to register a new type with the specified schema.
 *                                   Currently the schema is expected to be a Joi instance but
 *                                   this is probably going to change.
 * `getModel(typeName)`: returns the model instance for the specified type name.
 */
export default function (kibana) {

  const API_ROOT = '/api/saved-objects/v1';

  return new kibana.Plugin({
    name: 'saved_objects_api',
    require: ['elasticsearch'],

    init(server, options) {
      const registry = initRegistry(server);

      require('./lib/routes/v1')(server, API_ROOT);

      /**
       * Format errors to have a structure similar to the one
       * returned by the Elasticsearch REST API.
       */
      server.ext('onPreResponse', (request, reply) => {
        if (request.path && request.path.indexOf(API_ROOT) !== 0) {
          return reply.continue();
        }
        const response = request.response;
        if (response.isBoom) {
          response.output.payload = {
            error: {
              type: response.output.payload.error,
              reason: response.output.payload.message
            },
            status: response.output.statusCode
          };
        }
        return reply.continue();
      });

      server.expose('registerType', (typeName, schema) => registry.set(typeName, schema));
      server.expose('getModel', (typeName) => registry.get(typeName));
    }
  });

}
