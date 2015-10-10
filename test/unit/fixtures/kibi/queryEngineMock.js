var _ = require('lodash');
var root = require('requirefrom')('');
var Promise = require('bluebird');
var QueryEngine = root('src/server/lib/sindicetech/queryEngine');

function QueryEngineMock() {
  this.initialized = true;

  this.cache = null;
  this.datasources = [];
  this.queries = [];
}

QueryEngineMock.prototype = _.create(Object.getPrototypeOf(QueryEngine), {
  'constructor': QueryEngineMock
});

QueryEngineMock.prototype._init = function () {
  return Promise.resolve(true);
};

QueryEngineMock.prototype.addDatasource = function (def) {
  this.datasources.push(def);
};

QueryEngineMock.prototype.addQuery = function (query) {
  var datasource = this._getDatasourceById(query.config.datasourceId);
  if (datasource === null) {
    throw new Error('Datasource not found: ' + query.config.datasourceId);
  }
  query.config.datasource = datasource;
  this.queries.push(query);
};

QueryEngineMock.prototype.clear = function () {
  this.datasources.length = 0;
  this.queries.length = 0;
};

module.exports = QueryEngineMock;
