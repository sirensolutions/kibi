// kibi: we modify this SavedObjectsClient to make it use kibi savedObjectApi,
// we passed request to every method
// TODO: modify 'bulkCreate', 'bulkGet' to use our model

import Boom from 'boom';
import uuid from 'uuid';
import { get } from 'lodash';

import {
  createFindQuery,
  createIdQuery,
  v5BulkCreate,
  v6BulkCreate,
  normalizeEsDoc,
  includedFields,
  decorateEsError,
  errors,
} from './lib';

export const V6_TYPE = 'doc';

export class SavedObjectsClient {
  constructor(kibanaIndex, mappings, callAdminCluster, savedObjectsApi) {
    this._kibanaIndex = kibanaIndex;
    this._mappings = mappings;
    this._callAdminCluster = callAdminCluster;
    // kibi: added by kibi
    this._savedObjectsApi = savedObjectsApi;
  }

  static errors = errors
  errors = errors

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @returns {promise} - { id, type, version, attributes }
  */
  async create(type, attributes = {}, options = {}, req) {
    const method = options.id && !options.overwrite ? 'create' : 'index';
    const response = await this._withKibanaIndexAndMappingFallback(method, {
      type,
      id: options.id,
      body: attributes,
      refresh: 'wait_for'
    }, {
      type: V6_TYPE,
      id: `${type}:${options.id || uuid.v1()}`,
      body: {
        type,
        attributes: attributes
      }
    }, req);

    return normalizeEsDoc(response, { type, attributes });
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.force=false] - overrides existing documents
   * @property {string} [options.format=v5]
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects, options = {}) {
    const { format = 'v5' } = options;

    const bulkCreate = format === 'v5' ? v5BulkCreate : v6BulkCreate;
    const response = await this._withKibanaIndex('bulk', {
      body: bulkCreate(objects, options),
      refresh: 'wait_for'
    });

    const items = get(response, 'items', []);
    const missingTypesCount = items.filter(item => {
      const method = Object.keys(item)[0];
      return get(item, `${method}.error.type`) === 'type_missing_exception';
    }).length;

    const formatFallback = format === 'v5' && items.length > 0 && items.length === missingTypesCount;

    if (formatFallback) {
      return this.bulkCreate(objects, Object.assign({}, options, { format: 'v6' }));
    }

    return get(response, 'items', []).map((resp, i) => {
      const method = Object.keys(resp)[0];
      const { type, attributes } = objects[i];

      return normalizeEsDoc(resp[method], {
        id: resp[method]._id,
        type,
        attributes,
        error: resp[method].error ? { message: get(resp[method], 'error.reason') } : undefined
      });
    });
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  async delete(type, id, req) {
    const response = await this._withKibanaIndex('delete', {
      id: id,
      type: type,
      refresh: 'wait_for'
    }, req);

    if (get(response, 'deleted') === 0) {
      throw errors.decorateNotFoundError(Boom.notFound());
    }
  }

  /**
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {string} options.sortField
   * @property {string} options.sortOrder
   * @property {array|string} options.fields
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find(options = {}, req) {
    const {
      type,
      search,
      searchFields,
      page = 1,
      perPage = 20,
      sortField,
      sortOrder,
      fields,
    } = options;

    const esOptions = {
      _source: includedFields(type, fields),
      type: options.type,
      size: perPage,
      from: perPage * (page - 1),
      body: createFindQuery(this._mappings, { search, searchFields, type, sortField, sortOrder })
    };

    const response = await this._withKibanaIndex('search', esOptions, req);

    return {
      saved_objects: get(response, 'hits.hits', []).map(hit => {
        return normalizeEsDoc(hit);
      }),
      total: get(response, 'hits.total', 0),
      per_page: perPage,
      page

    };
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet(objects = []) {
    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    const docs = objects.reduce((acc, { type, id }) => {
      return [...acc, {}, createIdQuery({ type, id })];
    }, []);

    const response = await this._withKibanaIndex('msearch', { body: docs });
    const responses = get(response, 'responses', []);

    return {
      saved_objects: responses.map((r, i) => {
        const [hit] = get(r, 'hits.hits', []);

        if (!hit) {
          return Object.assign({}, objects[i], {
            error: { statusCode: 404, message: 'Not found' }
          });
        }

        return normalizeEsDoc(hit, objects[i]);
      })
    };
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type, id, req) {
    const params = {
      type: type,
      id: id
    };

    const response = await this._withKibanaIndex('get', params, req);
    return Object.assign({}, {
      id,
      type,
      version: response._version,
      attributes: get(response, '_source')
    });
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @returns {promise}
   */
  async update(type, id, attributes, options = {}, req) {
    const response = await this._withKibanaIndexAndMappingFallback('update', {
      id,
      type,
      version: options.version,
      refresh: 'wait_for',
      body: attributes
    }, {
      type: V6_TYPE,
      id: `${type}:${id}`,
      body: {
        doc: {
          [type]: attributes
        }
      }
    }, req);

    return normalizeEsDoc(response, { id, type, attributes });
  }

  _withKibanaIndexAndMappingFallback(method, params, fallbackParams, req) {
    // kibi: savedObject error messages are different
    const fallbacks = {
      'create': ['Type ' + params.type + ' not found.'],
      'index': ['Type ' + params.type + ' not found.'],
      'update': ['Type ' + params.type + ' not found.']
    };
    // kibi: end

    return this._withKibanaIndex(method, params, req).catch(err => {
      const fallbackWhen = get(fallbacks, method, []);

      if (err.message && fallbackWhen.includes(err.message)) {
        return this._withKibanaIndex(method, fallbackParams, req);
      }

      throw err;
    });
  }

  async _withKibanaIndex(method, params, req) {
    try {
      let model;
      switch (method) {
        case 'index':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.index(params.body, req);
          break;
        case 'create':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.create(params.id, params.body, req);
          break;
        case 'update':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.update(params.id, params.body, req);
          break;
        case 'bulk':
          // TODO implement in our model and call our model
          return await this._callAdminCluster('bulk', {
            ...params,
            index: this._kibanaIndex,
          });
          break;
        case 'delete':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.delete(params.id, req);
          break;
        case 'search':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.search(params.size, params.body, req);
          break;
        case 'msearch':
          // TODO implement in our model and call our model
          return await this._callAdminCluster('msearch', {
            ...params,
            index: this._kibanaIndex,
          });
          break;
        case 'get':
          model = this._savedObjectsApi.getModel(params.type);
          return await model.get(params.id, req);
          break;
      }

    } catch (err) {
      throw decorateEsError(err);
    }
  }
}
