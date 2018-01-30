import requirefrom from 'requirefrom';
import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 12.
 *
 * Looks for:
 *
 * - the kibi:default_dashboard_title in investigate.yml
 *
 * Then:
 *
 * - put kibi:defaultDashboardId value to the advanced settings
 */
export default class Migration12 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._config =  configuration.config;
    this._index = configuration.config.get('kibana.index');
    this._defaultDashboardTitleYml = configuration.config.get('investigate_core.default_dashboard_title');
    this._type = 'config';
    this._query = {
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: 'kibi'
              }
            }
          ]
        }
      }
    };
  }
  static get description() {
    return 'Migrate investigate_core:default_dashboard_title property to advanced settings';
  }

  async _fetchDashboards() {
    if (!this._dashboards) {
      this._dashboards = await this.scrollSearch(this._index, 'dashboard');
    }
  }

  async count() {
    let count = 0;
    if (!this._defaultDashboardTitleYml) {
      return count;
    }

    await this._fetchDashboards();
    const dashboardWithTitleFromYmlFound = _.find(this._dashboards, d => d._source.title === this._defaultDashboardTitleYml);

    if (!dashboardWithTitleFromYmlFound) {
      this._logger.warning('[' + this._defaultDashboardTitleYml + '] is set as investigate_core.default_dashboard_title' +
      ' in investigate.yml but dashboard cannot be found.');
      return count;
    }

    const objects = await this.scrollSearch(this._index, this._type, this._query);
    _.each(objects, (object) => {
      if(!this._doesDashboardExist(object._source['kibi:defaultDashboardId'])) {
        count++;
      }
    });
    return count;
  }

  _doesDashboardExist(dashboardId) {
    if (!dashboardId) {
      return false;
    }

    const found = _.find(this._dashboards, d => d._id === dashboardId);
    return Boolean(found);
  }

  async upgrade() {
    let upgraded = 0;
    if (!this._defaultDashboardTitleYml) {
      return upgraded;
    }

    let body = '';
    this._logger.info(`Updating investigate_core.default_dashboard_title from config`);

    await this._fetchDashboards();

    let defaultDashboardId;
    const dashboardWithTitleFromYmlFound = _.find(this._dashboards, d => d._source.title === this._defaultDashboardTitleYml);
    if (dashboardWithTitleFromYmlFound) {
      defaultDashboardId = dashboardWithTitleFromYmlFound._id;
    } else {
      this._logger.info(this._defaultDashboardTitleYml + ` dashboard cannot be found.`);
      return upgraded;
    }

    const objects = await this.scrollSearch(this._index, this._type, this._query);
    for (const obj of objects) {
      // check if kibi:defaultDashboardId contains a valid dashboard id
      if (!this._doesDashboardExist(obj._source['kibi:defaultDashboardId'])) {
        body += JSON.stringify({
          update: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' + JSON.stringify({
          doc: {
            'kibi:defaultDashboardId': defaultDashboardId
          }
        }) + '\n';
        upgraded++;
      }
    }

    if (upgraded > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return upgraded;
  }
}
