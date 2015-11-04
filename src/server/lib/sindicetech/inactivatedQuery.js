var Promise = require('bluebird');

function InactivatedQuery(id) {
  this.id = id;
}


InactivatedQuery.prototype.fetchResults = function (options, onlyIds) {
  var self = this;
  return Promise.resolve({
    queryId: self.id,
    ids: [],
    queryActivated: false
  });
};


InactivatedQuery.prototype.getHtml = function (queryDef, options) {
  var self = this;
  return Promise.resolve({
    queryId: self.id,
    queryActivated: false
  });
};

module.exports = InactivatedQuery;
