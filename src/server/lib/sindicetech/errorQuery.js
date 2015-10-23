var _       = require('lodash');
var AbstractQuery = require('./abstractQuery');

function ErrorQuery(message) {
  this.message = message;
}

ErrorQuery.prototype = _.create(AbstractQuery.prototype, {
  constructor: ErrorQuery
});

ErrorQuery.prototype.getErrorMessage = function () {
  return this.message;
};

ErrorQuery.prototype.checkIfItIsRelevant = _.noop;

ErrorQuery.prototype._getType = _.noop;

ErrorQuery.prototype._extractIds = _.noop;

ErrorQuery.prototype.fetchResults = _.noop;

ErrorQuery.prototype._postprocessResults = _.noop;

module.exports = ErrorQuery;
