import requirefrom from 'requirefrom';
import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 13.
 *
 * Looks for:
 *
 * - the "sourceFiltering" property in index patterns
 *
 * Then:
 *
 * - migrate them to new source filter syntax
 */
export default class Migration13 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._config =  configuration.config;
    this._index = configuration.config.get('kibana.index');
    this._type = 'index-pattern';
    this._query = {
      'query': {
        'exists' : { 'field' : 'sourceFiltering' }
      }
    };
  }

  static get description() {
    return 'Migrate old source filtering syntax in Index Pattern to new source filtering syntax';
  }

  async _fetchIndexPatterns() {
    this._indexPatterns = await this.scrollSearch(this._index, this._type, this._query);
  }

  async count() {
    const count = 0;
    await this._fetchIndexPatterns();
    if (this._indexPatterns.length === 0) {
      return count;
    }
    return this._indexPatterns.length;
  }

  async upgrade() {
    let upgraded = 0;
    const self = this;
    await this._fetchIndexPatterns();
    if (this._indexPatterns.length === 0) {
      return upgraded;
    }

    let body = '';
    this._logger.info(`Updating old source filter syntax to new source filter syntax`);

    await this._fetchIndexPatterns();

    _.each(this._indexPatterns, function (indexPattern) {
      if (indexPattern._source.sourceFiltering) {
        const sourceFilteringObject = JSON.parse(indexPattern._source.sourceFiltering);
        const graphBrowserFilter = sourceFilteringObject.kibi_graph_browser;
        const allExclude = sourceFilteringObject.all.exclude;
        const allInclude = sourceFilteringObject.all.include;

        if (graphBrowserFilter || allInclude) {
          if (graphBrowserFilter) {
            const message = '[ Graph Browser ] property in source filter is deprecated, removing from index pattern';
            self._logger.warning(message);
          }
          if (allInclude) {
            const message = '[ Include ] property in source filter is deprecated, removing from index pattern';
            self._logger.warning(message);
          }
        }

        if (allExclude) {
          const newFilter = [];
          if (_.isArray(allExclude)) {
            _.each(allExclude, function (filter) {
              newFilter.push({
                'value': filter
              });
            });
          } else if (_.isString(allExclude)) {
            newFilter.push({
              'value': allExclude
            });
          }
          const newFilterString = JSON.stringify(newFilter);
          body += JSON.stringify({
            update: {
              _index: indexPattern._index,
              _type: indexPattern._type,
              _id: indexPattern._id
            }
          }) + '\n' + JSON.stringify({
            doc: {
              'sourceFilters': newFilterString
            }
          }) + '\n';
        }

        body += JSON.stringify({
          update: {
            _index: indexPattern._index,
            _type: indexPattern._type,
            _id: indexPattern._id
          }
        }) + '\n' + JSON.stringify({
          script: 'ctx._source.remove(\'sourceFiltering\')'
        }) + '\n';
        upgraded++;
      }
    });

    if (upgraded > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return upgraded;
  }
}
