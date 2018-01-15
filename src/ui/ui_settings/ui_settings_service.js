import { defaultsDeep, noop } from 'lodash';

function hydrateUserSettings(userSettings) {
  return Object.keys(userSettings)
    .map(key => ({ key, userValue: userSettings[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

// kibi: added
function assertRequest(req) {
  if (
    !req ||
    typeof req !== 'object' ||
    typeof req.path !== 'string' ||
    !req.headers ||
    typeof req.headers !== 'object'
  ) {
    throw new TypeError('all uiSettings methods must be passed a hapi.Request object');
  }
}
// kibi: end

/**
 *  Service that provides access to the UiSettings stored in elasticsearch.
 *
 *  @class UiSettingsService
 *  @param {Object} options
 *  @property {string} options.index Elasticsearch index name where settings are stored
 *  @property {string} options.type type of ui settings Elasticsearch doc
 *  @property {string} options.id id of ui settings Elasticsearch doc
 *  @property {AsyncFunction} options.callCluster function that accepts a method name and
 *                            param object which causes a request via some elasticsearch client
 *  @property {AsyncFunction} [options.readInterceptor] async function that is called when the
 *                            UiSettingsService does a read() an has an oportunity to intercept the
 *                            request and return an alternate `_source` value to use.
 */
export class UiSettingsService {
  constructor(options) {
    const {
      type,
      id,
      savedObjectsClient,
      readInterceptor = noop,
      // we use a function for getDefaults() so that defaults can be different in
      // different scenarios, and so they can change over time
      getDefaults = () => ({}),
      server, // kibi: added
      status  // kibi: added
    } = options;

    this._savedObjectsClient = savedObjectsClient;
    this._getDefaults = getDefaults;
    this._readInterceptor = readInterceptor;
    this._type = type;
    this._id = id;

    this._server = server;
    this._status = status;
  }

  async getDefaults() {
    return await this._getDefaults();
  }

  // returns a Promise for the value of the requested setting
  async get(req, key) {
    assertRequest(req); // kibi: added
    const all = await this.getAll(req);
    return all[key];
  }

  async getAll(req) {
    assertRequest(req); // kibi: added
    const raw = await this.getRaw(req);

    return Object.keys(raw)
      .reduce((all, key) => {
        const item = raw[key];
        const hasUserValue = 'userValue' in item;
        all[key] = hasUserValue ? item.userValue : item.value;
        return all;
      }, {});
  }

  async getRaw(req) {
    assertRequest(req); // kibi: added
    const userProvided = await this.getUserProvided(req);
    return defaultsDeep(userProvided, await this.getDefaults());
  }

  async getUserProvided(req, options = {}) {
    assertRequest(req); // kibi: added

    // kibi: replace original code and adds savedObjectsAPI logic
    const { errors } = this._server.plugins.elasticsearch.getCluster('admin');
    const savedObjetsAPI = this._server.plugins.saved_objects_api;

    // kibi:
    // If the ui settings status isn't green, we shouldn't be attempting to get
    // user settings, since we can't be sure that all the necessary conditions
    // (e.g. elasticsearch being available) are met.
    if (this._status.state !== 'green' || savedObjetsAPI.status.state !== 'green') { // kibi: added savedObjectsAPI
      return hydrateUserSettings({});
    }

    // kibi: moved interceptor bit from removed _read
    const interceptValue = await this._readInterceptor(options);
    if (interceptValue && interceptValue !== null) {
      return hydrateUserSettings(interceptValue);
    }

    // kibi: adds savedObjetsAPI logic
    const configModel = savedObjetsAPI.getModel('config');

    let userSettings = {};
    const wrap401Errors = options.ignore401Errors !== undefined ? !options.ignore401Errors : false;
    try {
      const resp = await configModel.get('siren', req, { wrap401Errors });
      if (resp.found) {
        userSettings = resp._source;
      }
    } catch (err) {
      if (err.status === 401 && wrap401Errors) {
        throw err;
      }
      if (!(err instanceof errors.NoConnections) && err.status !== 403 && err.status !== 404) {
        throw err;
      }
    }
    return hydrateUserSettings(userSettings);
    // kibi: end
  }

  async setMany(req, changes) {
    assertRequest(req); // kibi: added
    await this._write(req, changes);
  }

  async set(req, key, value) {
    assertRequest(req); // kibi: added
    await this.setMany(req, { [key]: value });
  }

  async remove(req, key) {
    assertRequest(req); // kibi: added
    await this.set(req, key, null);
  }

  async removeMany(req, keys) {
    assertRequest(req); // kibi: added
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    await this.setMany(req, changes);
  }

  async _write(req, changes) {
    // kibi: replace original code and adds savedObjectsAPI logic
    const configModel = this._server.plugins.saved_objects_api.getModel('config');

    try {
      await configModel.patch('siren', changes, req);
    } catch (err) {
      if (err.status === 404) {
        await configModel.create('siren', changes, req);
      } else {
        throw err;
      }
    }
    return {};
    // kibi: end
  }

  // kibi: removed the _read method
  // and moved just the interceptor bit inside getUserProvided
}
