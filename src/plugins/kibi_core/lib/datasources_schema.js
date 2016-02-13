var fs = require('fs');
var path = require('path');
// TODO: consider to load it from config folder
//var env = process.env.NODE_ENV || 'development';
//var datasourceSchemaPath =
//  process.env.CONFIG_PATH ?
//  process.env.CONFIG_PATH.replace(/kibi\.yml/, 'datasources-schema.json') :
//  path.join(__dirname, 'datasources-schema.json');
var datasourceSchemaPath = path.join(__dirname, 'datasources_schema.json');
module.exports = JSON.parse(fs.readFileSync(datasourceSchemaPath, 'utf8'));
