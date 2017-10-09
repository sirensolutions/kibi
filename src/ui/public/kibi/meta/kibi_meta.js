import lru from 'lru-cache';
import { each, map } from 'lodash';
import { uiModules } from 'ui/modules';

// TODO:
//  add ability to cancel the queue
//  collectFor
// requestInProgress

function KibiMetaProvider(createNotifier, kibiState, es) {

  const notify = createNotifier({
    location: 'Kibi meta service'
  });

  class KibiMeta {
    constructor({
      enableCache = true,
      cacheSize = 500,
      cacheMaxAge = 1000 * 60 * 60
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

      // queues of requests to group and fire using _msearch
      // for a start have a single default queue
      this.queues = {
        default: [],
        buttons: [],
        dashboards: []
      };

      this.strategies = {
        buttons: {
          batchSize: 2,
          batchDelay: 50,
          retryOnError: 1,
          collectFor: 750,
          requestInProgress: false
        },
        dashboards: {
          batchSize: 2,
          batchDelay: 50,
          retryOnError: 1,
          collectFor: 750,
          requestInProgress: false
        }
      };
    }

    /*
     * Where dashboards is an array of objects in a following format
     * {
     *   definition: object with a query property
     *   callback: (Function to be executed when count is ready)
     * }
     *
     * This method only adds to the queue
     */
    getMetaForDashboards(dashboards = []) {
      each(dashboards, d => {
        this.queues.dashboards.push(d);
      });
      this._processSingleQueue('dashboards');
    }

    /*
     * Where buttons is an array of objects in a following format
     * {
     *   definition: object with a query property
     *   callback: function (meta) {} -Function to be executed when count is ready
     * }
     *
     * Meta contains following properties
     *   hit - full response for given query
     *   duration - time in ms that took to execute this msearch
     */
    getMetaForRelationalButtons(buttons = []) {
      each(buttons, b => {
        this.queues.buttons.push(b);
      });
      this._processSingleQueue('buttons');
    }

    _processQueues() {
      each(this.queues, (key, value) => {
        this._processSingleQueue(key);
      });
    }

    _processSingleQueue(queueName) {
      const strategy = this.strategies[queueName];
      const queue = this.queues[queueName];
      // check if there is request in progress
      if (strategy.requestInProgress) {
        // do nothing as it will call _processSingleQueue once request is finished
        return;
      }

      // take a number of queries to process
      const toProcess = [];
      const n = Math.min(strategy.batchSize, queue.length);
      for (let i = 0; i < n; i++) {
        const o = queue.shift();
        if (this.cache && this.cache.get(o.definition.query)) {
          o.callback(this.cache.get(o.definition.query));
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
      es
      .msearch({
        body: query,
        getMeta: queueName // ?getMeta= has no meaning it is just useful to filter by specific strategy
      })
      .then(data => {
        each(data.responses, (hit, i) => {
          const o = toProcess[i];
          if (this.cache) {
            this.cache.set(o.definition.query, hit);
          }
          o.callback(hit);
        });

        // maybe move this to finally
        if (queue.length > 0) {
          this._processSingleQueue(queueName);
        }
      }).catch(err => {
        // retry a number of times according to strategy but then stop
        each(toProcess, o => {
          if (!o.error) {
            o.error = 1;
          } else {
            o.error++;
          }
          if (o.error < strategy.retryOnError) {
            // put back to queue
            queue.push(o);
          } else {
            // report error to the user
            notify.error('Could not fetch meta for ' + JSON.stringify(o) + ' after retrying ' + strategy.retryOnError + ' times');
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
