import lru from 'lru-cache';
import { each, map, cloneDeep } from 'lodash';
import { uiModules } from 'ui/modules';
import { countStrategyValidator } from 'ui/kibi/meta/strategy_validator';
import { extractHighestTaskTimeoutFromMsearch } from 'ui/kibi/helpers/extract_highest_task_timeout_from_msearch';

function KibiMetaProvider(createNotifier, kibiState, es, config, $rootScope) {

  const notify = createNotifier({
    location: 'Kibi meta service'
  });

  class KibiMeta {
    constructor({
      enableCache = true,
      cacheSize = 500,
      cacheMaxAge = 1000 * 60
    } = {}) {

      // map to cache the counts based on generated query
      this.cache = null;

      if (enableCache) {
        const defaultSettings = {
          max: cacheSize,
          maxAge: cacheMaxAge
        };
        const lruCache = lru(defaultSettings);
        // we wrap here to be able to change cache lib if needed
        const cache = {
          set: function (key, value, maxAge) {
            lruCache.set(key, value, maxAge);
          },
          get: function (key) {
            return lruCache.get(key);
          },
          reset: function () {
            lruCache.reset();
          }
        };
        this.cache = cache;
      }

      // in order to make sure we are not executing
      // a callback from a previous object for particular id
      // while later one was already executed
      // we need to track this in the counters maps
      this.counters = {};

      this.queues = {};
      this.strategies = {};
      const dashboardStrategy = config.get('siren:countFetchingStrategyDashboards');
      this._validateStrategy(dashboardStrategy);
      this.setStrategy(dashboardStrategy);
      this.dashboardStrategyName = dashboardStrategy.name;
      const relFilterStrategy = config.get('siren:countFetchingStrategyRelationalFilters');
      this._validateStrategy(relFilterStrategy);
      this.setStrategy(relFilterStrategy);
      this.relFilterStrategyName = relFilterStrategy.name;

      $rootScope.$on('$routeChangeStart', (event, next, current) => {
        // here check if we are leaving dashboard app to another app where the
        // dashboard panel nor the relational buttons is visible
        // it is safe to flush all queues
        if (current.$$route.originalPath.indexOf('/dashboard') === 0 &&
            next.$$route.originalPath.indexOf('/dashboard') !== 0) {
          this.flushQueues();
          if (console.debug) { // eslint-disable-line no-console
            console.debug('Flushing kibiMeta queues'); // eslint-disable-line no-console
          }
        }
      });
    }

    flushCache() {
      this.cache.reset();
    }

    // should be called when leaving from dashboard -> another app
    flushQueues() {
      each(this.queues, (o, key) => {
        this.queues[key] = [];
      });
    }

    // should be called when destroying the relational buttons visualisation
    flushRelationalButtonsFromQueue() {
      each(this.queues, (o, key) => {
        for (let i = this.queues[key].length - 1; i >= 0; i--) {
          const obj = this.queues[key][i];
          if (obj.definition._debug_type === 'button') {
            this.queues[key].splice(i, 1);
          }
        }
      });
    }

    _validateStrategy(strategy) {
      try {
        countStrategyValidator(strategy);
      } catch (e) {
        notify.error(e.message);
      }
    }

    setStrategy(strategy) {
      this.strategies[strategy.name] = strategy;
      // set counters
      this.updateStrategy(strategy.name, '_requestInProgress', 0);
      // set queue
      this._setQueue(strategy.name);
    }

    _setQueue(strategyName) {
      this.queues[strategyName] = [];
    }

    updateStrategy(strategyName, propertyName, propertyValue) {
      this.strategies[strategyName][propertyName] = propertyValue;
    }

    /*
     * Where dashboards is an array of objects in a following format
     * {
     *   definition: object with a query property
     *   callback: function to be executed when count is ready
     * }
     *
     * This method only adds to the queue
     */
    getMetaForDashboards(dashboards = []) {
      each(dashboards, d => {
        this._addToQueue(d, this.dashboardStrategyName, 'dashboard');
      });
      this._processSingleQueue(this.dashboardStrategyName);
    }

    /*
     * Where buttons is an array of objects in a following format
     * {
     *   definition: object with a query property
     *   callback: function (error, meta) {} - Function to be executed when count is ready
     * }
     *
     * Meta contains following properties
     *   hits
     *   status
     *   took
     *   planner
     *   timed_out
     *   _shards
     */
    getMetaForRelationalButtons(buttons = []) {
      each(buttons, b => {
        this._addToQueue(b, this.relFilterStrategyName, 'button');
      });
      this._processSingleQueue(this.relFilterStrategyName);
    }

    _addToQueue(definitionObject, queueName, debugType) {
      // first validate
      this._checkDefinition(definitionObject, queueName);
      // clone the definition to avoid surprises that the definition is changed while inside the queue
      const obj = {
        definition: cloneDeep(definitionObject.definition),
        callback: definitionObject.callback
      };
      obj.definition._debug_type = debugType;
      this.queues[queueName].push(obj);
    }

    _checkDefinition(definitionObject, queueName) {
      if (!definitionObject.definition) {
        throw new Error(
          'Wrong ' + queueName + ' definition: ' + JSON.stringify(definitionObject) +
          '. Definition requires a definition object like { id: ID, query: query}'
        );
      }
      if (!definitionObject.definition.id || !definitionObject.definition.query) {
        throw new Error(
          'Wrong ' + queueName + ' definition object: ' + JSON.stringify(definitionObject.definition) +
          '. Definition object requires two mandatory properties: id and query'
        );
      }
    }

    _processQueues() {
      each(this.queues, (key, value) => {
        this._processSingleQueue(key);
      });
    }

    _updateCounter(id, type) {
      if (!this.counters[id]) {
        this.counters[id] = {};
      }
      if (!this.counters[id][type]) {
        this.counters[id][type] = 1;
      } else {
        this.counters[id][type]++;
      }
      return this.counters[id][type];
    }

    _getSortedIndices(definitionObject) {
      const query = definitionObject.definition.query;
      const queryParts = query.split('\n');
      const metaPart = queryParts[0];
      const meta = JSON.parse(metaPart);
      const index = meta.index;
      if (index instanceof Array) {
        index.sort();
      }
      return JSON.stringify(index);
    }

    _processSingleQueue(queueName) {
      const strategy = this.strategies[queueName];
      // check if there is request in progress
      if (strategy._requestInProgress >= strategy.parallelRequests) {
        // do nothing as it will call _processSingleQueue once request is finished
        return;
      }

      const queue = this.queues[queueName];

      // NOTE:
      // Sort queue by target index name/s
      // Done to increase the chance of parts of queries beeing reused
      // by Federate during join computation while processing single msearch request
      queue.sort((a, b) => {
        const aString = this._getSortedIndices(a);
        const bString = this._getSortedIndices(b);
        return aString.localeCompare(bString);
      });

      // take a number of queries to process
      const toProcess = [];
      const n = Math.min(strategy.batchSize, queue.length);
      for (let i = 0; i < n; i++) {
        const o = queue.shift();
        if (this.cache && this.cache.get(o.definition.query)) {
          o.callback(null, this.cache.get(o.definition.query));
          continue;
        }
        toProcess.push(o);
      }

      // if there is nothing inside toProcess
      // and the queue is not empty continue to process the queue
      // else exit
      if (toProcess.length === 0) {
        if (queue.length > 0) {
          this._processSingleQueue(queueName);
        }
        return;
      }

      // fire the msearch
      let query = '';
      let debugInfo = '';

      for (let i = 0; i < toProcess.length; i++) {
        // set counters before sending the request
        toProcess[i]._sentCounter = this._updateCounter(toProcess[i].definition.id, 'sent');
        // compose query and debug info
        query += toProcess[i].definition.query;
        debugInfo += toProcess[i].definition._debug_type;
        if (i !== toProcess.length - 1) {
          debugInfo += '__';
        };
      }

      strategy._requestInProgress++;

      const payload = {
        body: query,
        // NOTE:
        // ?getMeta= has no meaning for elasticsearch
        // it is just useful to filter by specific strategy name
        // or to quickly know for what objects the individual queries where
        // e.g.: if the strategy name is default, first query is for dashboard and the second is for a button
        // the getMeta=default__dashboard__button
        getMeta: queueName + '__' + debugInfo
      };

      // add biggest task_timeout when detected in the body
      const result = extractHighestTaskTimeoutFromMsearch(payload.body);
      if (result.taskTimeout !== 0) {
        payload.task_timeout = result.taskTimeout;
        payload.body = result.body;
      }

      es
      .msearch(payload)
      .then(data => {
        strategy._requestInProgress--;
        each(data.responses, (hit, i) => {
          const o = toProcess[i];
          if (this.cache) {
            this.cache.set(o.definition.query, hit);
          }

          o._callbackCounter = this._updateCounter(o.definition.id, 'callback');
          if (o._sentCounter < o._callbackCounter) {
            // do not execute callback from this old request which have just arrived;
            return;
          }
          o.callback(null, hit);
        });

        // maybe move this to finally
        if (queue.length > 0) {
          this._processSingleQueue(queueName);
        }
      }).catch(err => {
        strategy._requestInProgress--;
        // retry a number of times according to strategy but then stop
        each(toProcess, o => {
          if (!o.retried) {
            o.retried = 1;
          } else {
            o.retried++;
          }
          if (o.retried <= strategy.retryOnError) {
            // put back to queue
            queue.push(o);
          } else {
            // report error to the user
            o.callback(
              new Error('Could not fetch meta for ' + JSON.stringify(o) + ' after retrying ' + strategy.retryOnError + ' times')
            );
          }
        });

        // maybe move this to finally
        if (queue.length > 0) {
          this._processSingleQueue(queueName);
        }
      });
    }

  }

  return new KibiMeta();
}

uiModules
.get('kibana/kibi_counts')
.service('kibiMeta', Private => Private(KibiMetaProvider));
