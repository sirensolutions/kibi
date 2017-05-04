import Promise from 'bluebird';
import Boom from 'boom';
import Joi from 'joi';
import { each, merge, get } from 'lodash';

/**
 * Saved object API routes.
 */
module.exports = (server, API_ROOT) => {

  /**
   * Returns a model instance for the specified @typename.
   */
  const getModel = (typename) => server.plugins.saved_objects_api.getModel(typename);

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
      case 'AuthorizationError':
        reply(Boom.forbidden(error.message));
        break;
      case 'AuthenticationError':
        reply(Boom.unauthorized('Unauthorized', 'Basic', {
          realm: 'Authentication required.'
        }));
        break;
      default:
        reply(Boom.badImplementation(`An error occurred processing your request: ${error}`));
        break;
    }
  }

  /**
   * Returns a single saved object.
   *
   * Returns the same response as an Elasticsearch API get operation on success or a
   * NotFound error if the object does not exist.
   */
  server.route({
    method: 'GET',
    path: `${API_ROOT}/{index}/{type}/{id}`,
    handler: (request, reply) => {
      let model;
      try {
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.get(request.params.id, request)
      .then((response) => {
        reply(response);
      })
      .catch((error) => {
        if (error.name === 'NotFoundError') {
          return reply({
            type: 'not_found',
            reason: error.message,
            status: 404,
            found: false
          }).code(404);
        }
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
      const promises = request.payload.docs.map((doc) => {
        try {
          return getModel(doc._type).get(doc._id, request)
          .then((response) => {
            return response;
          })
          .catch((error) => {
            let errorBody;
            switch (error.name) {
              case 'NotFoundError':
                errorBody = {
                  type: 'not_found',
                  reason: error.message,
                  status: 404,
                  found: false
                };
                break;
              case 'AuthorizationError':
                errorBody = {
                  type: 'security_exception',
                  reason: error.message,
                  status: 403,
                  found: false
                };
                break;
              case 'AuthenticationError':
                return Promise.reject(error);
              default:
                errorBody = {
                  type: 'backend_error',
                  reason: 'An error occurred while connecting to the backend.',
                  status: error.inner ? error.inner.status : 500,
                  found: false
                };
                break;
            }
            return Promise.resolve(merge(errorBody, doc));
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
      })
      .catch((error) => {
        if (error.name === 'AuthenticationError') {
          return reply(Boom.unauthorized('Unauthorized', 'Basic', {
            realm: 'Authentication required.'
          }));
        }
        replyError(error);
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
   * Updates a saved object in the .kibi index.
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
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.update(request.params.id, request.payload, request)
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
   * Creates a saved object in the .kibi index.
   *
   * Returns the same response as an Elasticsearch API index operation on success, a
   * wrapped error with the same format as Elasticsearch errors on conflicts.
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/{id}/_create`,
    handler: (request, reply) => {
      let model;
      try {
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.create(request.params.id, request.payload, request)
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
   * Partially updates a saved object in the .kibi index.
   *
   * Works like the Elasticsearch update API but accepts only a body containing a "doc"
   * object with the fields to update; scripting and upserts are not supported.
   *
   * Returns the same response as an Elasticsearch API update operation on success, a
   * wrapped error with the same format as Elasticsearch errors on conflicts.
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/{id}/_update`,
    handler: (request, reply) => {
      let model;
      try {
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.patch(request.params.id, request.payload.doc, request)
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
        payload: {
          doc: Joi.object().required()
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
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.delete(request.params.id, request)
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
   *   - size: the number of results to return; if not 0, will return all the objects of the specified type.
   *   - q: a text to search
   *   - exclude: a comma separated list of fields to exclude
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/_search`,
    handler: (request, reply) => {
      let model;
      try {
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      const size = request.query.size;
      let exclude = [];
      if (request.query.exclude) {
        exclude = request.query.exclude.split(',');
      }
      model.search(size, request.query.q || request.payload, request, exclude)
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
          scroll: Joi.any().default(null),
          search_type: Joi.any().default(null),
          q: Joi.string().default(null),
          exclude: Joi.string().default(null),
          sort: Joi.string().default(null)
        }
      }
    }
  });

  /**
   * Returns the number of saved objects of a specific type, using the same
   * format as an Elasticsearch count response.
   *
   * Errors are returned in the same format as Elasticsearch.
   *
   * Querystring parameters:
   *
   *   - q: a text to search
   *
   * Errors are formatted by a custom handler set in the init method of this plugin.
   */
  server.route({
    method: 'POST',
    path: `${API_ROOT}/{index}/{type}/_count`,
    handler: (request, reply) => {
      let model;
      try {
        model = getModel(request.params.type);
      } catch (error) {
        return reply(Boom.notFound(error));
      }
      model.count(request.query.q || request.payload, request)
      .then((count) => {
        reply({
          count: count
        });
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
          q: Joi.string().default(null)
        }
      }
    }
  });

};
