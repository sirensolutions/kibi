var Promise = require('bluebird');

function InactivatedQuery(id) {
  this.id = id;
}


InactivatedQuery.prototype.fetchResults = function (options, onlyIds) {
  return Promise.resolve({
    ids: [],
    queryActivated: false
  });
};


InactivatedQuery.prototype.getHtml = function (queryDef, options) {
  return Promise.resolve({
    queryActivated: false
  });
};

module.exports = InactivatedQuery;
