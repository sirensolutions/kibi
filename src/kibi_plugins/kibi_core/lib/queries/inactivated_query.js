import Promise from 'bluebird';

function InactivatedQuery(server, id) {
  this.id = id;
}

InactivatedQuery.prototype.fetchResults = function (options, onlyIds) {
  const self = this;
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
  const self = this;
  let html = 'No query template is triggered now. Select a document?';

  if (options.verbose) {
    html = `Query <b>${self.id}</b> not activated, select another document or check activation rules`;
  }

  return Promise.resolve({
    queryId: self.id,
    queryActivated: false,
    html,
    data: {
      config: {
        id: self.id
      }
    }
  });
};

module.exports = InactivatedQuery;
