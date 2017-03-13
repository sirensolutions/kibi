var fs = require('fs');
var path = require('path');
var env = process.env.NODE_ENV || 'development';
var datasourceSchemaPath =
  process.env.KIBI_SCHEMA_PATH ?
  process.env.KIBI_SCHEMA_PATH :
  path.join(__dirname, 'datasources_schema.json');
module.exports = JSON.parse(fs.readFileSync(datasourceSchemaPath, 'utf8'));
