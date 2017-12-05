import _ from 'lodash';
import chrome from 'ui/chrome';

import { resolve as resolveUrl, format as formatUrl } from 'url';
import { keysToSnakeCaseShallow, keysToCamelCaseShallow } from '../../../utils/case_conversion';
import { SavedObject } from './saved_object';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

/**
 * Interval that requests are batched for
 * @type {integer}
 */
const BATCH_INTERVAL = 100;

export class SavedObjectsClient {
  // kibi: ui SavedObjectsClient
  constructor($http, basePath = chrome.getBasePath(), PromiseCtor = Promise, savedObjectsAPI, kbnIndex) {
    this._$http = $http;
    this._apiBaseUrl = `${basePath}/api/saved_objects/`;
    this._PromiseCtor = PromiseCtor;
    this.batchQueue = [];
    // kibi:
    this._savedObjectsAPI = savedObjectsAPI;
    this._kbnIndex = kbnIndex;
  }

  /**
  * Persists an object
  *
  * @param {string} type
  * @param {object} [attributes={}]
  * @param {object} [options={}]
  * @property {string} [options.id] - force id on creation, not recommended
  * @property {boolean} [options.overwrite=false]
  * @returns {promise} - SavedObject({ id, type, version, attributes })
  */
  create(type, attributes = {}, options = {}) {
    if (!type || !attributes) {
      return this._PromiseCtor.reject(new Error('requires type and attributes'));
    }
    // kibi: use our SavedObjectAPI
    return this._savedObjectsAPI.index({
      index: this._kbnIndex,
      type: type,
      id: options.id,
      body: attributes
    }).then(resp => {
      return this.createSavedObject(resp);
    });
    // kibi:end
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  delete(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    return this._savedObjectsAPI.delete({
      index: this._kbnIndex,
      type: type,
      id: id
    });
  }

  /**
   * Search for objects
   *
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {array} options.fields
   * @returns {promise} - { savedObjects: [ SavedObject({ id, type, version, attributes }) ]}
   */
  find(options = {}) {
    // kibi: use our SavedObjectAPI
    const kibiSavedObjectAPIOptions = this._toSavedObjectAPIOptions(keysToSnakeCaseShallow(options));
    return this._savedObjectsAPI.search(kibiSavedObjectAPIOptions)
    .then((resp) => {
      resp.saved_objects = _.map(resp.hits.hits, hit => {
        const o = this._toSavedObjectOptions(hit);
        return this.createSavedObject(o);
      });
      return keysToCamelCaseShallow(resp);
    });
    // kibi: end
  }

  // kibi: methods to translate the options
  _toSavedObjectOptions(hit) {
    return {
      id: hit._id,
      type: hit._type,
      version: null, // kibi: no version
      attributes: hit._source
    };
  }

  _toSavedObjectAPIOptions(options) {
    const opt = _.clone(options);

    // TODO: allow fields in our savedObjectsAPI
    delete opt.fields;

    if (opt.search) {
      opt.q = options.search;
      delete opt.search;
    }
    if (opt.per_page) {
      opt.size = options.per_page;
      delete opt.per_page;
    }
    if (!opt.index) {
      opt.index = this._kbnIndex;
    }
    return opt;
  }
  // kibi: end

  /**
   * Fetches a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - SavedObject({ id, type, version, attributes })
   */
  get(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    // kibi: use our SavedObjectAPI
    return this._savedObjectsAPI.get({
      index: this._kbnIndex,
      type: type,
      id: id
    });
    // kibi: end
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} - { savedObjects: [ SavedObject({ id, type, version, attributes }) ] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet(objects = []) {
    return this._savedObjectsAPI.mget({
      body: { docs: objects.map(obj => this._transformToMget(this._kbnIndex, obj)) }
    });
  }

  // kibi: Takes an object and returns the associated data needed for an mget API request
  _transformToMget(kbnIndex, obj) {
    return { index: kbnIndex, _id: obj._id, _type: obj._type };
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} options
   * @param {integer} options.version - ensures version matches that of persisted object
   * @returns {promise}
   */
  update(type, id, attributes, { version } = {}) {
    if (!type || !id || !attributes) {
      return this._PromiseCtor.reject(new Error('requires type, id and attributes'));
    }

    const body = {
      attributes,
      version
    };

    // kibi: use our SavedObjectAPI
    return this._savedObjectsAPI.update({
      index: this._kbnIndex,
      type: type,
      id: id,
      body: body
    })
    .then((resp) => {
      return this.createSavedObject(resp);
    });
    // kibi: end
  }

  /**
   * Throttled processing of get requests into bulk requests at 100ms interval
   */
  processBatchQueue = _.throttle(() => {
    const queue = _.cloneDeep(this.batchQueue);
    this.batchQueue = [];

    this.bulkGet(queue).then(({ savedObjects }) => {
      queue.forEach((queueItem) => {
        const foundObject = savedObjects.find(savedObject => {
          return savedObject.id === queueItem.id & savedObject.type === queueItem.type;
        });

        if (!foundObject) {
          return queueItem.resolve(this.createSavedObject(_.pick(queueItem, ['id', 'type'])));
        }

        queueItem.resolve(foundObject);
      });
    });

  }, BATCH_INTERVAL, { leading: false });

  createSavedObject(options) {
    return new SavedObject(this, options);
  }

  _getUrl(path, query) {
    if (!path && !query) {
      return this._apiBaseUrl;
    }

    return resolveUrl(this._apiBaseUrl, formatUrl({
      pathname: join(...path),
      query: _.pick(query, value => value != null)
    }));
  }

  _request(method, url, body) {
    const options = { method, url, data: body };

    if (method === 'GET' && body) {
      return this._PromiseCtor.reject(new Error('body not permitted for GET requests'));
    }

    return this._$http(options)
      .then(resp => _.get(resp, 'data'))
      .catch(resp => {
        const respBody = _.get(resp, 'data', {});
        const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);

        err.statusCode = respBody.statusCode || resp.status;
        err.body = respBody;

        throw err;
      });
  }
}
