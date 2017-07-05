import _ from 'lodash';
import requirefrom from 'requirefrom';
const Migration = requirefrom('src/migrations')('migration');
const pkg = requirefrom('src/utils')('packageJson');
const { mappings } = require('../../../elasticsearch/lib/kibana_index_mappings');

/**
 * Kibi Core - Migration 5.
 *
 * Looks for:
 *
 * - checks if kibi index has a mapping for url.sirenSession
 *
 * Then:
 *
 * - if there was no mapping sets the mapping
 * - iterate over existing url objects and if not null old kibiSession property detected
 *   move the content to sirenSession property
 */
export default class Migration6 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
  }

  static get description() {
    return 'Sets url.sirenSession mapping';
  }

  async count() {
    const mappings = await this._client.indices.getMapping({
      index: this._index,
      ignoreUnavailable: false,
      allowNoIndices: false
    });

    const sirenSessionMapping = _.get(mappings[this._index].mappings, 'url.properties.sirenSession');
    // if there is no mapping for sireSession we have to migrate
    // if there is migration was already done
    let upgrade = 0;
    if (!sirenSessionMapping) {
      // we count 1 as we have to set the mapping
      upgrade = 1;
    }

    // add the number of url objects to migrate
    const objects = await this.scrollSearch(this._index, 'url');
    if (objects.length === 0) {
      return upgrade;
    }
    for (const obj of objects) {
      // count all documents with not empty old kibiSession property
      if (obj._source.kibiSession) {
        upgrade++;
      }
    }
    return upgrade;
  }

  _bulkUpdate(index, type, id, doc) {
    const meta = {
      update: {
        _index: index,
        _type: type,
        _id: id
      }
    };
    return JSON.stringify(meta) + '\n' +
           JSON.stringify({ doc }) + '\n';
  }

  async upgrade() {
    const doMigration = await this.count();
    if (doMigration > 0) {

      let upgradedMapping = 0;
      const mappings = await this._client.indices.getMapping({
        index: this._index,
        ignoreUnavailable: false,
        allowNoIndices: false
      });

      const sirenSessionMapping = _.get(mappings[this._index].mappings, 'url.properties.sirenSession');
      if (!sirenSessionMapping) {
        this._logger.info('Going to set the mapping for url.sirenSession property');
        const result = await this._client.indices.putMapping({
          index: this._index,
          ignoreUnavailable: false,
          allowNoIndices: false,
          type: 'url',
          body: {
            properties: {
              sirenSession: {
                type: 'object',
                enabled: false
              }
            }
          }
        });

        if (result instanceof Error) {
          this._logger.error('Could not set mappings for url.sirenSession property', result);
          return 0;
        }
        upgradedMapping = 1;
      }

      let upgradedUrls = 0;
      const objects = await this.scrollSearch(this._index, 'url');
      if (objects.length === 0) {
        return upgradedMapping + upgradedUrls;
      }

      let body = '';
      // now iterate over all url objects and if old kibiSession detected rewrite it to sirenSession
      for (const obj of objects) {
        if (!obj._source.kibiSession) {
          continue;
        }

        this._logger.info(`Updating the url object with _id=${obj._id}`);
        body += this._bulkUpdate(
          obj._index,
          'url',
          obj._id,
          // copy old kibiSession to new sirenSession
          {sirenSession: obj._source.kibiSession, kibiSession: null},
        );
        upgradedUrls++;
      }

      if (upgradedUrls > 0) {
        const result = await this._client.bulk({
          refresh: true,
          body: body
        });

        if (result instanceof Error) {
          this._logger.error(
            'Could NOT upgrage old kibiSession to new sirenSession property in ' +
            upgradedUrls + ' url object' + (upgradedUrls > 1 ? 's' : ''),
            result
          );
          return upgradedMapping + upgradedUrls;
        }
      }
      return upgradedMapping + upgradedUrls;
    }
    return 0;
  }

}
