import Joi from 'joi';
import joiToMapping from './_joi_to_mapping';
import AuthorizationError from './errors/authorization';
import AuthenticationError from './errors/authentication';
import NotFoundError from './errors/not_found';
import ConflictError from './errors/conflict';
import { get, set } from 'lodash';


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
   * Sets the specified @credentials in client @parameters.
   * @private
   */
  _setCredentials(parameters, credentials) {
    if (!credentials) {
      return;
    }
    for (const key of Object.keys(credentials)) {
      set(parameters, key, credentials[key]);
    }
  }

  /**
   * Creates the mappings for the type managed by this model.
   *
   * @param {Object} credentials - Optional user credentials.
   */
  async createMappings(credentials) {
    if (await this.hasMappings(credentials)) {
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
    this._setCredentials(parameters, credentials);
    //TODO: replace with this._client once owner tracking is available
    const client = this._type === 'session' ? this._sessionClient : this._client;
    await client.indices.putMapping(parameters);
  }

  /**
   * Checks if the mappings for the type have been defined.
   *
   * @param {Object} credentials - Optional user credentials.
   */
  async hasMappings(credentials) {
    if (!this.schema) {
      return true;
    }
    const parameters = {
      index: this._config.get('kibana.index'),
      type: this._type
    };
    this._setCredentials(parameters, credentials);
    const mappings = await this._client.indices.getMapping(parameters);

    return Object.keys(mappings).length !== 0;
  }

  /**
   * Creates a new object instance.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} credentials - Optional user credentials.
   */
  async create(id, body, credentials) {
    this._prepare(body);

    try {
      await this.createMappings(credentials);
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
        this._setCredentials(parameters, credentials);
      }

      return await client.create(parameters);
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Updates an existing object.
   *
   * @param {String} id - The object id.
   * @param {Object} body - The object body.
   * @param {Object} credentials - Optional user credentials.
   */
  async update(id, body, credentials) {
    this._prepare(body);
    try {
      await this.createMappings(credentials);
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
        this._setCredentials(parameters, credentials);
      }

      return await client.index(parameters);
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Partially updates an existing object.
   *
   * @param {String} id - The object id.
   * @param {String} type - The object type.
   * @param {Object} fields - The changed fields.
   * @param {Object} credentials - Optional user credentials.
   */
  async patch(id, fields, credentials) {
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

      //TODO: remove once owner tracking is available
      const client = this._type === 'session' ? this._sessionClient : this._client;
      if (this._type !== 'session') {
        this._setCredentials(parameters, credentials);
      }

      return await client.update(parameters);
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Returns all the objects of the type managed by this model.
   *
   * @param {Number} size - The number of results to return.
   * @param {String} searchString - An optional search string.
   * @param {Object} credentials - Optional user credentials.
   * @return {Array} A list of objects of the specified type.
   * @throws {NotFoundError} if the object does not exist.
   */
  async search(size, searchString, credentials) {
    let body;
    if (searchString) {
      body = {
        query: {
          simple_query_string: {
            query: `${searchString}*`,
            fields: ['title^3', 'description'],
            default_operator: 'AND'
          }
        }
      };
    } else {
      body = {
        query: {
          match_all: {}
        }
      };
    }
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        size: size || 100
      };
      this._setCredentials(parameters, credentials);
      return await this._client.search(parameters);
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Returns the object with the specified id.
   *
   * @param {String} id - An id.
   * @param {Object} credentials - Optional user credentials.
   * @return {Object} The object instance having the specified id.
   * @throws {NotFoundError} if the object does not exist.
   */
  async get(id, credentials) {
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id
      };
      this._setCredentials(parameters, credentials);
      return await this._client.get(parameters);
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
   * @param {String} id - An id.
   * @param {Object} credentials - Optional user credentials.
   * @throws {NotFoundError} if the object does not exist.
   */
  async delete(id, credentials) {
    try {
      const parameters = {
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        refresh: true
      };
      this._setCredentials(parameters, credentials);
      return await this._client.delete(parameters);
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundError(`${id} does not exist.`, error);
      }
      this._wrapError(error);
    }
  }

}
