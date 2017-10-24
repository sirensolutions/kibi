import cryptoHelper from '../crypto_helper';
import datasourcesSchema from '../datasources_schema';

function AbstractDatasourceDef(server, datasource) {
  if (typeof datasource.datasourceParams === 'string' || datasource.datasourceParams instanceof String) {
    try {
      datasource.datasourceParams = JSON.parse(datasource.datasourceParams);
    } catch (e) {
      throw new Error('Could not parse datasourceParams json for ' + this.id + ' datasource');
    }
  }
  this.datasource = datasource;
  this.config = server.config();
  this.schema = [];
}

AbstractDatasourceDef.prototype.getSchema = function () {
  return this.schema;
};

AbstractDatasourceDef.prototype._getDefinitionFromSchema = function (name) {
  for (let i = 0; i < this.datasource.datasourceClazz.schema.length; i++) {
    if (this.datasource.datasourceClazz.schema[i].name === name) {
      return this.datasource.datasourceClazz.schema[i];
    }
  }
  return null;
};

AbstractDatasourceDef.prototype._decryptValue = function (v) {
  return cryptoHelper.decrypt(this.config.get('kibi_core.datasource_encryption_key'), v);
};

AbstractDatasourceDef.prototype.populateParameters = function (s) {

  const regex = /\$\{([A-Za-z0-9_-]{1,})\}/g;
  let match;
  const variableNames = [];
  while (match = regex.exec(s)) {
    variableNames.push(match[1]);
  }

  if (variableNames.length > 0) {
    for (let i = 0; i < variableNames.length; i++) {
      // get the definition from schema
      const name = variableNames[i];
      let value = this.datasource.datasourceClazz.datasource.datasourceParams[name];

      const varDef = this._getDefinitionFromSchema(name);
      if (!varDef) {
        throw new Error('Missing schema def for variable ' + name);
      }

      if (varDef.encrypted) {
        value = this._decryptValue(value);
      }

      // now replace it in the connection string
      s = s.replace('${' + name + '}', value);
    }
  }

  return s;
};

module.exports = AbstractDatasourceDef;
