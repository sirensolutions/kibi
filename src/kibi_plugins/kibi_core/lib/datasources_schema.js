import { readFileSync } from 'fs';
import { join } from 'path';

class DatasourcesSchema {
  constructor() {
    const datasourceSchemaPath = process.env.KIBI_SCHEMA_PATH ?  process.env.KIBI_SCHEMA_PATH : join(__dirname, 'datasources_schema.json');
    this._schemas = JSON.parse(readFileSync(datasourceSchemaPath, 'utf8'));
  }

  getSchema(type) {
    const schema = this._schemas && this._schemas[type];

    if (!schema) {
      throw new Error(`Could not get schema for datasource type: ${type}.`);
    }

    return this._schemas.base ? schema.concat(this._schemas.base) : schema;
  }

  getBase() {
    return this._schemas.base;
  }
}

export default new DatasourcesSchema();
