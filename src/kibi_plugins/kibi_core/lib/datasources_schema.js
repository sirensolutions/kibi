import { cloneDeep, each, remove, defaults, clone } from 'lodash';
import { readFileSync } from 'fs';
import { join } from 'path';

function mergeByName(baseSchema, customSchema) {
  const baseSchemaClone = cloneDeep(baseSchema);
  const customSchemaClone = cloneDeep(customSchema);

  const merged = each(customSchemaClone, customSchemaProperty => {
    const [ baseSchemaProperty ] = remove(baseSchemaClone, 'name', customSchemaProperty.name);
    if (baseSchemaProperty) {
      defaults(customSchemaProperty, baseSchemaProperty);
    }
  });

  // add base parameters that are left over
  each(baseSchemaClone, baseSchemaProperty => {
    merged.push(clone(baseSchemaProperty));
  });

  return merged;
}

class DatasourcesSchema {
  constructor() {
    const datasourceSchemaPath = process.env.KIBI_SCHEMA_PATH ?  process.env.KIBI_SCHEMA_PATH : join(__dirname, 'datasources_schema.json');
    this._schemas = JSON.parse(readFileSync(datasourceSchemaPath, 'utf8'));
  }

  setSchemas(schemas) {
    const prev = this._schemas;
    this._schemas = schemas;
    return prev;
  }

  getSchema(type) {
    const schema = this._schemas && this._schemas[type];

    if (!schema) {
      throw new Error(`Could not get schema for datasource type: ${type}.`);
    }

    return mergeByName(this._schemas.base, schema);
  }

  getBase() {
    return this._schemas.base;
  }

  toInjectedVar() {
    const vars = {
      rest: this.getSchema('rest'),
      sqlite: this.getSchema('sqlite'),
      mysql: this.getSchema('mysql'),
      postgresql: this.getSchema('postgresql'),
      sparql_http: this.getSchema('sparql_http'),
      jdbc: this.getSchema('jdbc'),
      tinkerpop3: this.getSchema('tinkerpop3')
    };
    return Object.freeze(vars);
  }
}

export default new DatasourcesSchema();
