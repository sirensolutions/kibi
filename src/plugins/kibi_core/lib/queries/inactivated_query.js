var Promise = require('bluebird');

function InactivatedQuery(server, id) {
  this.id = id;
}


InactivatedQuery.prototype.fetchResults = function (options, onlyIds) {
  var self = this;
  return Promise.resolve({
    queryId: self.id,
    ids: [],
    queryActivated: false,
    data: {
      config: {
        id: self.id
      }
    }
  });
};


InactivatedQuery.prototype.getHtml = function (queryDef, options) {
  var self = this;
  return Promise.resolve({
    queryId: self.id,
    queryActivated: false,
    data: {
      config: {
        id: self.id
      }
    }
  });
};

module.exports = InactivatedQuery;
