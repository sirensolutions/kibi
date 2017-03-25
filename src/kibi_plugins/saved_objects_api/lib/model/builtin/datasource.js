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
    const cryptoHelper = this._server.plugins.kibi_core.getCryptoHelper();
    cryptoHelper.encryptDatasourceParams(this._config, body);
  }

}
