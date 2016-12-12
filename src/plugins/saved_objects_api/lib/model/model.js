import Joi from 'joi';
import joiToMapping from './_joi_to_mapping';
import AuthorizationError from './errors/authorization';
import NotFoundError from './errors/not_found';
import ConflictError from './errors/conflict';

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
    this._type = type;
    this._client = server.plugins.elasticsearch.client;
    this._config = server.config();
    this._schema = schema;
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
      default:
        throw error;
    }
  }

  /**
   * Creates the mappings for the type managed by this model.
   */
  async createMappings() {
    if (await this.hasMappings()) {
      return;
    }
    const body = {};
    body[this._type] = {
      properties: joiToMapping(this.schema)
    };
    await this._client.indices.putMapping({
      index: this._config.get('kibana.index'),
      type: this._type,
      body: body
    });
  }

  /**
   * Checks if the mappings for the type have been defined.
   */
  async hasMappings() {
    if (!this.schema) {
      return true;
    }
    const mappings = await this._client.indices.getMapping({
      index: this._config.get('kibana.index'),
      type: this._type
    });

    return Object.keys(mappings).length !== 0;
  }

  /**
   * Creates a new object instance.
   *
   * @param {String} id - The object id.
   * @param {String} type - The object type.
   * @param {Object} body - The object body.
   */
  async create(id, body) {
    try {
      await this.createMappings();
      return await this._client.create({
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      });
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Updates an existing object.
   *
   * @param {String} id - The object id.
   * @param {String} type - The object type.
   * @param {Object} body - The object body.
   */
  async update(id, body) {
    try {
      await this.createMappings();
      return await this._client.index({
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        refresh: true
      });
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
   */
  async patch(id, fields) {
    try {
      return await this._client.update({
        id: id,
        index: this._config.get('kibana.index'),
        type: this._type,
        body: {
          doc: fields
        },
        refresh: true
      });
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Returns all the objects of the type managed by this model.
   *
   * @param {Number} size - The number of results to return.
   * @param {String} searchString - An optional search string.
   * @return {Array} A list of objects of the specified type.
   * @throws {NotFoundError} if the object does not exist.
   */
  async search(size, searchString) {
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
      return await this._client.search({
        index: this._config.get('kibana.index'),
        type: this._type,
        body: body,
        size: size || 100
      });
    } catch (error) {
      this._wrapError(error);
    }
  }

  /**
   * Returns the object with the specified id.
   *
   * @param {String} id - An id.
   * @return {Object} The object instance having the specified id.
   * @throws {NotFoundError} if the object does not exist.
   */
  async get(id) {
    try {
      return await this._client.get({
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id
      });
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
   * @throws {NotFoundError} if the object does not exist.
   */
  async delete(id) {
    try {
      return await this._client.delete({
        index: this._config.get('kibana.index'),
        type: this._type,
        id: id,
        refresh: true
      });
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundError(`${id} does not exist.`, error);
      }
      this._wrapError(error);
    }
  }

}
