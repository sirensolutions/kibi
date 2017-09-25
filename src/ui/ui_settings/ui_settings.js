import { defaultsDeep } from 'lodash';
import Bluebird from 'bluebird';

import { getDefaultSettings } from './defaults';

function hydrateUserSettings(user) {
  return Object.keys(user)
    .map(key => ({ key, userValue: user[key] }))
    .filter(({ userValue }) => userValue !== null)
    .reduce((acc, { key, userValue }) => ({ ...acc, [key]: { userValue } }), {});
}

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

export class UiSettings {
  constructor(kbnServer, server, status) { // kibi: adds kbnServer argument
    this._server = server;
    this._status = status;
  }

  getDefaults() {
    return getDefaultSettings();
  }

  // returns a Promise for the value of the requested setting
  async get(req, key) {
    assertRequest(req);
    return this.getAll(req)
      .then(all => all[key]);
  }

  async getAll(req) {
    assertRequest(req);
    return this.getRaw(req)
      .then(raw => Object.keys(raw)
        .reduce((all, key) => {
          const item = raw[key];
          const hasUserValue = 'userValue' in item;
          all[key] = hasUserValue ? item.userValue : item.value;
          return all;
        }, {})
      );
  }

  async getRaw(req) {
    assertRequest(req);
    return this.getUserProvided(req)
      .then(user => defaultsDeep(user, this.getDefaults()));
  }

  async getUserProvided(req, { ignore401Errors = false } = {}) {
    assertRequest(req);
    // kibi: replace original code and adds savedObjectsAPI logic
    const { errors } = this._server.plugins.elasticsearch.getCluster('admin');
    const savedObjetsAPI = this._server.plugins.saved_objects_api;

    // If the ui settings status isn't green, we shouldn't be attempting to get
    // user settings, since we can't be sure that all the necessary conditions
    // (e.g. elasticsearch being available) are met.
    if (this._status.state !== 'green' || savedObjetsAPI.status.state !== 'green') { // kibi: added savedObjectsAPI
      return hydrateUserSettings({});
    }

    // kibi: adds savedObjetsAPI logic
    const configModel = savedObjetsAPI.getModel('config');

    let userSettings = {};
    try {
      const resp = await configModel.get('kibi', req, { wrap401Errors: !ignore401Errors });
      if (resp.found) {
        userSettings = resp._source;
      }
    } catch (err) {
      if (err.status === 401 && !ignore401Errors) {
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
    assertRequest(req);
    // kibi: replace original code and adds savedObjectsAPI logic
    const configModel = this._server.plugins.saved_objects_api.getModel('config');

    try {
      await configModel.patch('kibi', changes, req);
    } catch (err) {
      if (err.status === 404) {
        await configModel.create('kibi', changes, req);
      } else {
        throw err;
      }
    }
    return {};
    // kibi: end
  }

  async set(req, key, value) {
    assertRequest(req);
    return this.setMany(req, { [key]: value });
  }

  async remove(req, key) {
    assertRequest(req);
    return this.set(req, key, null);
  }

  async removeMany(req, keys) {
    assertRequest(req);
    const changes = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    return this.setMany(req, changes);
  }

  // kibi: _getClientSettings function removed
}
