import Joi from 'joi';
import Model from '../model';

/**
 * Model for datasource objects.
 */
export default class DatasourceModel extends Model {

  constructor(server) {
    const schema = Joi.object().keys({
      title: Joi.string(),
      description: Joi.string(),
      datasourceType: Joi.string(),
      datasourceParams: Joi.object(),
      version: Joi.number().integer(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'datasource', schema, 'External datasource');
  }

  _prepare(body) {
    super._prepare(body);
    // kibi: if we don't have this plugin let's not throw exception here and silently fail
    if (this._server.plugins.kibi_query_engine) {
      const cryptoHelper = this._server.plugins.kibi_query_engine.getCryptoHelper();
      cryptoHelper.encryptDatasourceParams(this._config, body);
    }
  }

}
