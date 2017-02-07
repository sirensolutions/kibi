import Joi from 'joi';
import joiToMapping from './_joi_to_mapping';
import AuthorizationError from './errors/authorization';
import AuthenticationError from './errors/authentication';
import NotFoundError from './errors/not_found';
import ConflictError from './errors/conflict';
import { get, set, isString } from 'lodash';


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
   */
  constructor(server, type, schema) {
    this._server = server;
    this._plugin = server.plugins.saved_objects_api;
    this._type = type;
    this._config = server.config();
    this._schema = schema;

    this._client = server.plugins.elasticsearch.createClient({
      auth: false
    });
    //TODO: the current implementation of sessions requires them to be
    // writeable by all users; this code must be removed as soon as
    // owner tracking is available.
    this._sessionClient = server.plugins.elasticsearch.client;
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
   * @param {Object} request - An optional HAPI request.
   */
  async createMappings(request) {
    if (await this.hasMappings(request)) {
      return;
    }
    const body = {};
    body[this._type] = {
      properties: joiToMapping(this.schema)
    };
    const parameters = {
      index: this._config.get('kibana.index'),
      type: this._type,
      body: body
    };
    this._setCredentials(parameters, request);
    //TODO: replace with this._client once owner tracking is available
    const client = this._type === 'session' ? this._sessionClient : this._client;
    await client.indices.putMapping(parameters);
  }

  /**
   * Checks if the mappings for the type have been defined.
   *
   * @param {Object} request - An optional HAPI request.
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
    const mappings = await this._client.indices.getMapping(parameters);

    return Object.keys(mappings).length !== 0;
  }

  /**
   * Creates a new object instance.
   *
   * Arguments and response can be modified or validated by middlewares.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} request - An optional HAPI request.
   */
  async create(id, body, request) {
    try {
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.createRequest(this, id, body, request);
      }

      this._prepare(body);

      await this.createMappings(request);
      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      };

      //TODO: remove once owner tracking is available
      const client = this._type === 'session' ? this._sessionClient : this._client;
      if (this._type !== 'session') {
        this._setCredentials(parameters, request);
      }

      const response = await client.create(parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.createResponse(this, id, body, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Updates an existing object.
   *
   * Arguments and response can be modified or validated by middlewares.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} request - An optional HAPI request.
   */
  async update(id, body, request) {
    try {
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.updateRequest(this, id, body, request);
      }
      this._prepare(body);

      await this.createMappings(request);
      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      };

      //TODO: remove once owner tracking is available
      const client = this._type === 'session' ? this._sessionClient : this._client;
      if (this._type !== 'session') {
        this._setCredentials(parameters, request);
      }

      const response = await client.index(parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.updateResponse(this, id, body, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Partially updates an existing object.
   *
   * @param {String} id - The object id.
   * @param {Object} fields - The changed fields.
   * @param {Object} request - An optional HAPI request.
   */
  async patch(id, fields, request) {
    try {
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.patchRequest(this, id, fields, request);
      }

      const parameters = {
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: {
          doc: fields
        },
        refresh: true
      };

      //TODO: remove once owner tracking is available
      const client = this._type === 'session' ? this._sessionClient : this._client;
      if (this._type !== 'session') {
        this._setCredentials(parameters, request);
      }

      const response = await client.update(parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.patchResponse(this, id, fields, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Returns all the objects of the type managed by this model.
   *
   * Arguments and response can be modified and validated by middlewares.
   *
   * @param {Number} size - The number of results to return.
   * @param {String} search - An optional search string or query body.
   * @param {Object} request - Optional HAPI request.
   * @return {Array} A list of objects of the specified type.
   * @throws {NotFoundError} if the object does not exist.
   */
  async search(size, search, request) {
    try {
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.searchRequest(this, size, search, request);
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

      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        size: size || 100
      };
      this._setCredentials(parameters, request);

      const response = await this._client.search(parameters);
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.searchResponse(this, size, search, request, response);
      }
      return response;
    } catch (error) {
      this._wrapError(error);
    }
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
  async get(id, request) {
    try {
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.getRequest(this, id, request);
      }
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id
      };
      this._setCredentials(parameters, request);
      const response = await this._client.get(parameters);
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
      for (const middleware of this._plugin.getMiddlewares()) {
        await middleware.deleteRequest(this, id, request);
      }
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        refresh: true
      };
      this._setCredentials(parameters, request);
      await this._client.delete(parameters);
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
