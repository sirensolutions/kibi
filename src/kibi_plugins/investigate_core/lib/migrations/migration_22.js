import Migration from 'kibiutils/lib/migrations/migration';
import _ from 'lodash';
import rp from 'request-promise';
import GremlinServerHandler from '../../../../server/gremlin_server/gremlin_server';

/**
 * Investigate Core - Migration 22.
 *
 * Looks for:
 *
 * - the siren:relations advanced setting inside siren (singleton) config
 *
 * Then:
 *
 * - if not null uses the gremlin server to convert it to the ontology based schema.
 * - deletes the siren:relations setting.
 */
export default class Migration22 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._server = configuration.server;
    this._index = configuration.config.get('kibana.index');
    this._type = 'config';
    this._ontologyType = 'ontology-model';
    this._ontologyId = 'default-ontology';
    this._query = {
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: 'siren'
              }
            },
            {
              exists: {
                field: 'siren:relations'
              }
            }
          ]
        }
      }
    };
  }

  static get description() {
    return 'Convert the old relational schema to the new ontology based one.';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    if (objects.length !== 1) {
      this._logger.error('There should be only one config object');
      return 0;
    }

    if (objects[0]._source['siren:relations']) {
      return 1;
    }

    return 0;
  }

  _getOntologyModelFromGremlin() {
    const config = this._server.config();
    const url = config.get('investigate_core.gremlin_server.url');

    const options = {
      method: 'GET',
      uri: url + '/schema/getSchema'
    };

    return rp(options);
  }

  async upgrade() {
    let count = 0;
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return count;
    }
    if (objects.length !== 1) {
      this._logger.error('There should be only one config object');
      return count;
    }
    const obj = objects[0];
    if (!obj._source['siren:relations']) {
      return count;
    }

    const relations = JSON.parse(obj._source['siren:relations']);

    this._logger.info(`Updating siren:relations from config with _id=${obj._id}`);

    const gremlin = new GremlinServerHandler(this._server);
    try {
      await gremlin.start().then(() => {
        // get the ontology schema
        return this._getOntologyModelFromGremlin()
        .then((ontology) => {
          //gremlin.stop();
          // add the new ontology-model document
          let body = JSON.stringify({
            index: {
              _index: this._index,
              _type: this._ontologyType,
              _id: this._ontologyId
            }
          }) + '\n' +
          JSON.stringify({ model: ontology, version: 1 }) + '\n';

          // remove siren:relations from the config object
          delete obj._source['siren:relations'];
          body += JSON.stringify({
            index: {
              _index: obj._index,
              _type: obj._type,
              _id: obj._id
            }
          }) + '\n' +
          JSON.stringify(obj._source);

          return this._client.bulk({
            refresh: true,
            body: body
          })
          .then(() => {
            count = 1;
            return gremlin.stop();
          });
        })
        .catch(() => {
          this._logger.error('An error occurred while retrieving the ontology model.');
        });
      });
    } catch (err) {
      this._logger.error('Could not start the Siren Gremlin Server');
    }

    //gremlin.stop();
    return count;
  }
}
