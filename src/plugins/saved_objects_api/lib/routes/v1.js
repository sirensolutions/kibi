import Promise from 'bluebird';
import Boom from 'boom';
import Joi from 'joi';
import { each, merge } from 'lodash';

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
   * Returns multiple saved objects.
   *
   * Accepts a request and returns a response with the same format as the Elasticsearch
   * mget API on success, a wrapped error with the same format as Elasticsearch errors
   * on conflicts.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/_mget`,
    handler: (request, reply) => {
      let typeCache = {};
      let promises = request.payload.docs.map((doc) => {
        try {
          let model = typeCache[doc._type];
          if (!model) {
            const ModelClass = require(`../model/${doc._type}`);
            model = typeCache[doc._type] = new ModelClass(server);
          }
          return model.get(doc._id)
          .then((response) => {
            return response;
          })
          .catch((error) => {
            return Promise.resolve(merge({
              error: {
                type: 'backend_error',
                reason: 'An error occurred while connecting to the backend.'
              }
            }, doc));
          });
        } catch (error) {
          return Promise.resolve(merge({
            error: {
              type: 'unknown_type',
              reason: `Unknown type: ${doc._type}`
            }
          }, doc));
        }
      });
      Promise.all(promises)
      .then((results) => {
        reply({
          docs: results
        });
      });
    },
    config: {
      validate: {
        payload: {
          docs: Joi.array()
        }
      }
    }
  });

  /**
   * Creates a new saved object in the .kibi index.
   *
   * Works like a PUT by default, can be forced to work as a POST by setting the
   * querystring parameter `op_type` to `create`.
   *
   * Returns the same response as an Elasticsearch API index operation on success, a
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
          index: Joi.string().required(),
          type: Joi.string().required(),
          id: Joi.string()
        },
        query: {
          op_type: Joi.string().allow('').regex(/create/)
        }
      }
    }
  });

  /**
   * Deletes a saved object in the .kibi index.
   */
  server.route({
    method: 'DELETE',
    path: `${API_ROOT}/{index}/{type}/{id}`,
    handler: (request, reply) => {
      let model;
      try {
        const ModelClass = require(`../model/${request.params.type}`);
        model = new ModelClass(server);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.delete(request.params.id)
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
          index: Joi.string().required(),
          type: Joi.string().required(),
          id: Joi.string()
        }
      }
    }
  });

  /**
   * Returns a collection of saved objects of a specific type, using the same
   * format as an Elasticsearch search response.
   *
   * Errors are returned in the same format as Elasticsearch.
   *
   * Querystring parameters:
   *
   *   - size: the number of results to return
   *   - q: a text to search
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/_search`,
    handler: (request, reply) => {
      let model;
      try {
        const ModelClass = require(`../model/${request.params.type}`);
        model = new ModelClass(server);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.search(request.query.size, request.query.q)
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
          index: Joi.string().required(),
          type: Joi.string().required()
        },
        query: {
          size: Joi.number().integer().default(100),
          q: Joi.string().default(null)
        }
      }
    }
  });

};
