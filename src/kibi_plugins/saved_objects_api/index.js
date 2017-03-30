import initRegistry from './lib/init_registry';
import Model from './lib/model/model';
import builtin from './lib/model/builtin';

/**
 * Saved objects API plugin.
 *
 * This plugin provides an API to perform crud operations on saved objects.
 *
 * Might be superseded by https://github.com/elastic/kibana/issues/5480 at some point.
 *
 * The plugin exposes the following methods:
 *
 * `registerType(configuration)`: allows to register a new type with the specified configuration.
 *                                Configuration is expected to contain a `schema` attribute with
 *                                a Joi instance containing the schema of the type, a `type`
 *                                attribute containing the type name and an optional `title`
 *                                attribute containing the type title.
 * `getModel(typeName)`: returns the model instance for the specified type name.
 * `getTypes()`: returns the registered type as `{type: 'name', title: 'title'}`.
 * `registerMiddleware(middleware)`: allows to register an API middleware.
 * `getMiddlewares()`: returns the list of registered API middlewares.
 * `getServerCredentials`: returns the server credentials.
 */
export default function (kibana) {

  const API_ROOT = '/api/saved-objects/v1';

  return new kibana.Plugin({
    name: 'saved_objects_api',
    require: ['elasticsearch', 'kibi_core'],

    init(server, options) {
      const config = server.config();

      const typeRegistry = initRegistry(server);
      const middlewares = new Set();

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

      server.expose('registerType', (configuration) => {
        typeRegistry.set(configuration.type, new Model(server, configuration.type, configuration.schema, configuration.title));
      });
      server.expose('registerMiddleware', (middleware) => middlewares.add(middleware));
      server.expose('getMiddlewares', () => middlewares);
      server.expose('getModel', (typeName) => typeRegistry.get(typeName));
      server.expose('getTypes', () => typeRegistry.list());
      server.expose('getServerCredentials', () => {
        const username = config.get('elasticsearch.username');
        const password = config.get('elasticsearch.password');
        if (username && password) {
          const authHeader = new Buffer(`${username}:${password}`).toString('base64');
          return {
            headers: {
              authorization: `Basic ${authHeader}`
            }
          };
        }
      });
    },

    uiExports: {
      hacks: [
        'plugins/saved_objects_api/services/types',
        'plugins/saved_objects_api/modals/service'
      ],
      injectDefaultVars: () => ({
        savedObjectsAPIBuiltin: builtin
      })
    },

  });

}
