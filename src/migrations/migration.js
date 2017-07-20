import { has, defaults, merge } from 'lodash';

/**
 * The base class for migrations.
 */
export default class Migration {
  /**
   * Creates a new Migration.
   *
   * @param configuration {object} The migration configuration.
   */
  constructor(configuration) {
    if (!configuration) throw new Error('Configuration not specified.');

    this._client = configuration.client;
    this._config = configuration.config;
  }

  /**
   * Returns the description of the migration.
   */
  static get description() {
    return 'No description';
  }

  /**
   * Returns the number of objects that can be upgraded by this migration.
   */
  async count() {
    return 0;
  }

  /**
   * Performs an upgrade and returns the number of objects upgraded.
   */
  async upgrade() {
    return 0;
  }

  /**
   * Performs an Elasticsearch query using the scroll API and returns the hits.
   *
   * @param index - The index to search.
   * @param type - The type to search.
   * @param query - The query body.
   * @param options - Additional options for the search method; currently the
   *                  only supported one is `size`.
   * @return The search hits.
   */
  async scrollSearch(index, type, query, options) {
    let objects = [];

    const opts = defaults(options || {}, {
      size: 100
    });

    let searchOptions = {
      index: index,
      type: type,
      scroll: '1m',
      size: opts.size
    };

    if (query) {
      searchOptions.body = query;
    }

    let response = await this._client.search(searchOptions);

    while (true) {
      objects.push(...response.hits.hits);
      if (objects.length === response.hits.total) {
        break;
      }
      response = await this._client.scroll({
        body: {
          scroll: '1m',
          scroll_id: response._scroll_id
        }
      });
    }

    return objects;
  }

  /**
   * Performs an Elasticsearch query and returns the number of hits.
   *
   * @param index - The index to search.
   * @param type - The type to search.
   * @param query - The query body.
   * @return The number of search hits.
   */
  async countHits(index, type, query) {
    let searchOptions = {
      index: index,
      type: type,
      body: query
    };

    let response = await this._client.count(searchOptions);
    return response.count;
  }
};
