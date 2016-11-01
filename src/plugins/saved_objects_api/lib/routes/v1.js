import Boom from 'boom';
import Joi from 'joi';

/**
 * Saved object API routes.
 */
module.exports = (server, API_ROOT) => {

  /**
   * Wraps model errors and sets the body of the reply.
   *
   * @param {Error} error - The error to handle.
   * @param {reply} reply - an HAPI reply instance.
   */
  function replyError(error, reply) {
    switch (error.name) {
      case 'NotFoundError':
        reply(Boom.notFound(error.message));
        break;
      case 'ConflictError':
        reply(Boom.conflict(error.message));
        break;
      default:
        reply(Boom.badImplementation(`An error occurred while indexing the object: ${error}`));
        break;
    }
  }

  /**
   * Creates a new saved object in the .kibi index.
   *
   * Works like a PUT by default, can be forced to work as a POST by setting the
   * querystring parameter `op_type` to `create`.
   *
   * Returns the same response as an Elasticsearch API index on success, a
   * wrapped error with the same format as Elasticsearch errors on conflicts.
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/{id}`,
    handler: (request, reply) => {
      let model;
      try {
        const ModelClass = require(`../model/${request.params.type}`);
        model = new ModelClass(server);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      let method = 'update';
      if (request.query.op_type === 'create') {
        method = 'create';
      }
      model[method](request.params.id, request.payload)
      .then((response) => {
        reply(response);
      })
      .catch((error) => {
        return replyError(error, reply);
      });
    },
    config: {
      validate: {
        params: {
          index: Joi.string(),
          type: Joi.string().regex(/session/),
          id: Joi.string()
        },
        query: {
          op_type: Joi.string().allow('').regex(/create/)
        }
      }
    }
  });

};
