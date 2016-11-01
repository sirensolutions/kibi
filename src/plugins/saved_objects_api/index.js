/**
 *
 */
export default function (kibana) {

  const API_ROOT = '/api/saved-objects/v1';
  return new kibana.Plugin({
    name: 'saved_objects_api',
    require: ['elasticsearch'],

    init(server, options) {
      require('./lib/routes/v1')(server, API_ROOT);

      /**
       * Format errors to have a structure similar to the one
       * returned by the Elasticsearch REST API.
       */
      server.ext('onPreResponse', (request, reply) => {
        if (request.path && request.path.indexOf(API_ROOT) !== 0) {
          return reply.continue();
        }
        var response = request.response;
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
    }
  });

}
