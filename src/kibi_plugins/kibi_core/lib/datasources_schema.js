const fs = require('fs');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const datasourceSchemaPath =
  process.env.KIBI_SCHEMA_PATH ?
  process.env.KIBI_SCHEMA_PATH :
  path.join(__dirname, 'datasources_schema.json');
module.exports = JSON.parse(fs.readFileSync(datasourceSchemaPath, 'utf8'));
