import Joi from 'joi';
import joiToMapping from './_joi_to_mapping';
import AuthorizationError from './errors/authorization';
import AuthenticationError from './errors/authentication';
import NotFoundError from './errors/not_found';
import ConflictError from './errors/conflict';
import { get, set, isString, cloneDeep, merge } from 'lodash';


/**
 * A model that manages objects having a specific type.
 */
export default class Model {

  /**
   * Creates a new Model.
   *
   * @param {Server} server - A Server instance.
   * @param {String} type - The Elasticsearch type managed by this model.
   * @param {Joi} schema - A Joi schema describing the type.
   *                       If null, mappings for the object will not be generated.
   * @param {String} title - Optional type title.
   */
  constructor(server, type, schema, title) {
    this._server = server;
    this._plugin = server.plugins.saved_objects_api;
    this._type = type;
    this._title = title ? title : this._type;
    this._config = server.config();
    this._schema = schema;

    this._cluster = server.plugins.elasticsearch.getCluster('admin');
  }

  /**
   * Returns the schema of the type managed by this model.
   *
   * @return {Joi}
   */
  get schema() {
    return this._schema;
  }

  /**
   * Returns the type managed by this model.
   *
   * @return {String}
   */
  get type() {
    return this._type;
  }

  /**
   * Returns the title of the type managed by this model.
   *
   * @return {String}
   */
  get title() {
    return this._title;
  }

  /**
   * Wraps an Elasticsearch error and throws it.
   *
   * @param {Error} error - An Elasticsearch error.
   * @private
   */
  _wrapError(error) {
    switch (error.status) {
      case 409:
        throw new ConflictError('An object with the same type and id already exists.', error);
      case 404:
        throw new NotFoundError('Object not found.', error);
      case 403:
        throw new AuthorizationError('Unauthorized', error);
      case 401:
        throw new AuthenticationError('Authentication required', error);
      default:
        throw error;
    }
  }

  /**
   * Prepares an object body before sending to the backend.
   *
   * @param {Object} body - An object.
   */
  _prepare(body) {
  }

  /**
   * Sets credentials extracted from the specified HAPI @request, if any.
   * @private
   */
  _setCredentials(parameters, request) {
    const headerPath = 'headers.authorization';
    const authorizationHeader = get(request, headerPath);
    if (authorizationHeader) {
      set(parameters, headerPath, authorizationHeader);
    }
  }

  /**
   * Creates the mappings for the type managed by this model.
   *
   * @param {Object} request - An optional HAPI request or an object
   *                            containing Elasticsearch client parameters.
   */
  async createMappings(request) {
    if (await this.hasMappings(request)) {
      return;
    }
    const body = {};
    if (this._type === 'doc') {
      body[this._type] = {
        dynamic: true
      };
    } else {
      body[this._type] = {
        properties: joiToMapping(this.schema)
      };
    }

    const parameters = {
      index: this._config.get('kibana.index'),
      type: this._type,
      body: body
    };
    this._setCredentials(parameters, request);
    return await this._cluster.callWithRequest({}, 'indices.putMapping', parameters);
  }

  /**
   * Checks if the mappings for the type have been defined.
   *
   * @param {Object} request - An optional HAPI request or an object
   *                            containing Elasticsearch client parameters.
   */
  async hasMappings(request) {
    if (!this.schema) {
      return true;
    }
    const parameters = {
      index: this._config.get('kibana.index'),
      type: this._type
    };
    this._setCredentials(parameters, request);

    // NOTE:
    // There is a difference between elasticsearch 5.4.x and 5.5.x
    // when there is no mappings
    // 5.4.x resolve with an empty object
    // 5.5.x rejects with a proper Error object
    try {
      const mappings = await this._cluster.callWithRequest({}, 'indices.getMapping', parameters);
      return Object.keys(mappings).length !== 0;
    } catch (error) {
      // throw if an Error is different than NotFound
      if (!(error.statusCode === 404 && error.displayName === 'NotFound')) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Creates a new object instance.
   *
   * Middlewares can:
   *
   * - validate the parameters by implementing createRequest and updateRequest
   * - return custom ES client parameters from createRequest and updateRequest;
   *   parameters are merged.
   * - alter the return value  by implementing createResponse.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} request - An optional HAPI request.
   */
  async create(id, body, request) {
    try {
      let requestMiddlewareMethod = 'createRequest';
      const responseMiddlewareMethod = 'createResponse';

      let response = await this._cluster.callWithInternalUser('get', {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        ignore: [404]
      });
      if (response.found) {
        requestMiddlewareMethod = 'updateRequest';
      }

      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      };
      this._setCredentials(parameters, request);

      for (const middleware of this._plugin.getMiddlewares()) {
        merge(parameters, await middleware[requestMiddlewareMethod](this, id, body, request));
      }

      this._prepare(body);

      await this.createMappings(parameters);

      response = await this._cluster.callWithRequest({}, 'create', parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware[responseMiddlewareMethod](this, id, body, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

 /**
   * Index a new object instance.
   *
   *
   * @param {Object} body - The object body.
   * @param {Object} request - An optional HAPI request.
   */
  async index(body, request) {
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      };
      this._setCredentials(parameters, request);

      this._prepare(body);

      await this.createMappings(parameters);

      const response = await this._cluster.callWithInternalUser('index', parameters);

      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Updates an existing object.
   *
   * Middlewares can:
   *
   * - validate the parameters by implementing updateRequest
   * - return custom ES client parameters from updateRequest; parameters are merged.
   * - alter the return value  by implementing createResponse.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} request - An optional HAPI request.
   */
  async update(id, body, request) {
    try {
      let requestMiddlewareMethod = 'updateRequest';
      let responseMiddlewareMethod = 'updateResponse';

      const response = await this._cluster.callWithInternalUser('get', {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        ignore: [404]
      });
      if (!response.found) {
        requestMiddlewareMethod = 'createRequest';
        responseMiddlewareMethod = 'createResponse';
      }

      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      };
      this._setCredentials(parameters, request);

      for (const middleware of this._plugin.getMiddlewares()) {
        merge(parameters, await middleware[requestMiddlewareMethod](this, id, body, request));
      }

      this._prepare(body);

      await this.createMappings(parameters);

      await this._cluster.callWithRequest({}, 'index', parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware[responseMiddlewareMethod](this, id, body, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Partially updates an existing object.
   *
   * Middlewares can:
   *
   * - validate the parameters by implementing patchRequest
   * - return custom ES client parameters from patchRequest; parameters are merged.
   * - alter the return value  by implementing patchResponse.
   *
   * @param {String} id - The object id.
   * @param {Object} fields - The changed fields.
   * @param {Object} request - An optional HAPI request.
   */
  async patch(id, fields, request) {
    try {
      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: {
          doc: fields
        },
        refresh: true
      };

      this._setCredentials(parameters, request);

      for (const middleware of this._plugin.getMiddlewares()) {
        merge(parameters, await middleware.patchRequest(this, id, fields, request));
      }

      const response = await this._cluster.callWithRequest({}, 'update', parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.patchResponse(this, id, fields, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Searches objects of the type managed by this model.
   *
   * Middlewares can:
   *
   * - validate the parameters by implementing patchRequest
   * - return custom ES client parameters from patchRequest; parameters are merged.
   * - alter the return value  by implementing patchResponse.
   *
   * @param {Number} size - The number of results to return. If not set, returns all objects matching the search.
   * @param {String} search - An optional search string or query body.
   * @param {Object} request - Optional HAPI request.
   * @param {Array} exclude - An optional list of fields to exclude.
   * @return {Array} A list of objects of the specified type.
   * @throws {NotFoundError} if the object does not exist.
   */
  async search(size, search, request, exclude) {
    try {
      const commonParameters = {};
      this._setCredentials(commonParameters, request);

      for (const middleware of this._plugin.getMiddlewares()) {
        merge(commonParameters, await middleware.searchRequest(this, size, search, request));
      }

      let body;
      if (search) {
        if (isString(search)) {
          body = {
            query: {
              simple_query_string: {
                query: `${search}*`,
                fields: ['title^3', 'description'],
                default_operator: 'AND'
              }
            }
          };
        } else {
          body = search;
        }
      } else {
        body = {
          query: {
            match_all: {}
          }
        };
      }

      let parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
      };
      merge(parameters, commonParameters);

      if (exclude && exclude.length > 0) {
        parameters.body._source = {
          excludes: exclude
        };
      }

      if (size === 0) {
        parameters.size = 0;
      } else {
        parameters.size = 100;
        parameters.scroll = '1m';
      }

      let response = await this._cluster.callWithRequest({}, 'search', parameters);
      let scrollId = response._scroll_id;

      if (scrollId) {
        const hits = [];
        while (true) {
          hits.push(...response.hits.hits);
          if (hits.length === response.hits.total) {
            break;
          }
          parameters = merge({
            scroll: '1m',
            scrollId
          }, commonParameters);
          response = await this._cluster.callWithRequest({}, 'scroll', parameters);
          scrollId = response._scroll_id;
        }

        parameters = merge({
          scrollId
        }, commonParameters);

        try {
          await this._cluster.callWithRequest({}, 'clearScroll', parameters);
        } catch (error) {
          // ignore errors on clearScroll
        }

        response = {
          hits: {
            hits: hits,
            total: hits.length
          }
        };
      }

      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.searchResponse(this, size, search, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Counts objects of the type managed by this model.
   * @param {Object} request - Optional HAPI request.
   * @param {String} search - An optional search string or query body.
   * @return {Number} The number of objects of the type managed by this model.
   */
  async count(search, request) {
    const response = await this.search(0, search, request, null);
    return response.hits.total;
  }

  /**
   * Returns the object with the specified id.
   *
   * Arguments and response can be modified or validated by middlewares.
   *
   * @param {String} id - An id.
   * @param {Object} request - Optional HAPI request.
   * @return {Object} The object instance having the specified id.
   * @throws {NotFoundError} if the object does not exist.
   */
  async get(id, request, options) {
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id
      };
      this._setCredentials(parameters, request);

      for (const middleware of this._plugin.getMiddlewares()) {
        merge(parameters, await middleware.getRequest(this, id, request));
      }

      const response = await this._cluster.callWithRequest({}, 'get', parameters, options);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.getResponse(this, id, request, response);
      }
      return response;
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundError(`${id} does not exist.`, error);
      }
      this._wrapError(error);
    }
  }

  /**
   * Deletes the object with the specified id.
   *
   * Arguments can be modified or validated by middlewares.
   *
   * @param {String} id - An id.
   * @param {Object} request - Optional HAPI request.
   * @throws {NotFoundError} if the object does not exist.
   */
  async delete(id, request) {
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        refresh: true
      };
      this._setCredentials(parameters, request);
      for (const middleware of this._plugin.getMiddlewares()) {
        merge(parameters, await middleware.deleteRequest(this, id, request));
      }

      await this._cluster.callWithRequest({}, 'delete', parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.deleteResponse(this, id, request);
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundError(`${id} does not exist.`, error);
      }
      this._wrapError(error);
    }
  }

}
