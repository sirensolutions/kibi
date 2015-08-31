var Promise = require('bluebird');

function InactivatedQuery(id) {
  this.id = id;
}


InactivatedQuery.prototype.fetchResults = function (uri, onlyIds) {
  return Promise.resolve({
    ids: [],
    queryActivated: false
  });
};


InactivatedQuery.prototype.getHtml = function (uri, queryOptions) {
  return Promise.resolve({
    queryActivated: false
  });
};

module.exports = InactivatedQuery;
