import lru from 'lru-cache';
import { each, map } from 'lodash';
import { uiModules } from 'ui/modules';

function KibiMetaProvider(createNotifier, kibiState, es) {

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
      // we need to track this in the 2 maps
      this.counters = {};

      this.queues = {
        buttons: [],
        dashboards: []
      };

      this.strategies = {};
      this.setStrategy('buttons', {
        batchSize: 2,
        retryOnError: 1,
        parallelRequests: 1
      });
      this.setStrategy('dashboards', {
        batchSize: 2,
        retryOnError: 1,
        parallelRequests: 1
      });
    }

    flushCache() {
      this.cache.reset();
    }

    flushQueues() {
      each(this.queues, (o, key) => {
        this.queues[key] = [];
      });
    }

    setStrategy(strategyName, strategy) {
      this.strategies[strategyName] = strategy;
      // set counters
      this._setDefaultMeta(strategyName);
    }

    _setDefaultMeta(strategyName) {
      this.strategies[strategyName]._requestInProgress = 0;
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
        this._addToQueue(d, 'dashboards');
      });
      this._processSingleQueue('dashboards');
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
        this._addToQueue(b, 'buttons');
      });
      this._processSingleQueue('buttons');
    }

    _addToQueue(o, queueName) {
      this._checkDefinition(o, queueName);
      this.queues[queueName].push(o);
    }

    _checkDefinition(d, queueName) {
      if (!d.definition) {
        throw new Error(
          'Wrong ' + queueName + ' definition: ' + JSON.stringify(d) +
          '. Defintion requires a definition object like { id: ID, query: query}'
        );
      }
      if (!d.definition.id || !d.definition.query) {
        throw new Error(
          'Wrong ' + queueName + ' definition object: ' + JSON.stringify(d.definition) +
          '. Defintion object requires two mandatory properties: id and query'
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

    _processSingleQueue(queueName) {
      const strategy = this.strategies[queueName];
      // check if there is request in progress
      if (strategy._requestInProgress >= strategy.parallelRequests) {
        // do nothing as it will call _processSingleQueue once request is finished
        return;
      }

      const queue = this.queues[queueName];
      // take a number of queries to process
      const toProcess = [];
      const n = Math.min(strategy.batchSize, queue.length);
      for (let i = 0; i < n; i++) {
        const o = queue.shift();
        if (this.cache && this.cache.get(o.definition.query)) {
          o.callback(undefined, this.cache.get(o.definition.query));
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
        } else {
          return;
        }
      }

      // fire the msearch
      const query = map(toProcess, o => o.definition.query).join('');

      // set counters before sending the request
      each(toProcess, o =>{
        o._sentCounter = this._updateCounter(o.definition.id, 'sent');
      });

      strategy._requestInProgress++;
      es
      .msearch({
        body: query,
        getMeta: queueName // ?getMeta= has no meaning it is just useful to filter by specific strategy
      })
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
          o.callback(undefined, hit);
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
