/**
 * Manages scenarios for functional tests run against the esvm cluster; this
 * is basically a fork of the ScenarioManager defined in
 * /test/fixtures that can be used outside the native functional test suites.
 */
import path from 'path';
import elasticsearch from 'elasticsearch';

export default class ScenarioManager {

  constructor(server, timeout) {
    if (!server) throw new Error('No server defined');
    if (!timeout) timeout = 300;

    this.client = new elasticsearch.Client({
      host: server,
      requestTimeout: timeout
    });
  }

  /**
   * Load a testing scenario
   * @param {object} scenario The scenario configuration to load
   */
  async load(scenario) {
    var self = this;
    if (!scenario) throw new Error('No scenario specified');

    for (let bulk of scenario.bulk) {

      if (bulk.indexDefinition) {
        let body = require(path.join(scenario.baseDir, bulk.indexDefinition));
        await self.client.indices.create({
          index: bulk.indexName,
          body: body
        });
      }

      await self.client.cluster.health({
        waitForStatus: 'yellow'
      });

      let body = require(path.join(scenario.baseDir, bulk.source));
      try {
        let response = await self.client.bulk({
          refresh: true,
          body: body
        });

        if (response.errors) {
          throw new Error('bulk failed\n' + this.formatBulkErrorResponse(response));
        }
      } catch (err) {
        if (bulk.haltOnFailure === false) return;
        throw err;
      }

    }
  };

  /**
   * Formats a bulk error response.
   *
   * @param {Object} response The bulk response.
   * @return {String} the formatted error response.
   */
  formatBulkErrorResponse(response) {
    return response.items
      .map(i => i[Object.keys(i)[0]].error)
      .filter(Boolean)
      .map(err => '  ' + JSON.stringify(err))
      .join('\n');
  }

  /**
   * Unload a scenario.
   * @param {object} scenario The scenario configuration to unload.
   */
  async unload(scenario) {
    if (!scenario) throw new Error('No scenario specified');

    var indices = scenario.bulk.map(function mapBulk(bulk) {
      return bulk.indexName;
    });

    try {
      await this.client.indices.delete({
        index: indices
      });
    } catch (error) {
      // if the index never existed yet, or was already deleted it's OK
      if (error.message.indexOf('index_not_found_exception') < 0) {
        console.log('error.message: ' + error.message);
        throw error;
      }
    }
  };

  /**
   * Reload a scenario.
   * @param {object} scenario The scenario to reload.
   */
  async reload(scenario) {
    var self = this;

    await self.unload(scenario);
    await self.load(scenario);
  };

  /**
   * Sends a delete all indices request
   */
  async deleteAll() {
    await this.client.indices.delete({
      index: '*'
    });
  };
}
