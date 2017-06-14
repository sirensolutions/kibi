import Promise from 'bluebird';

class InactivatedQuery {
  constructor(server, id, label) {
    this.id = id;
    this.label = label;
  }

  fetchResults(options, onlyIds) {
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
  }

  getHtml(queryDef, options) {
    const self = this;
    let html = 'No query template is triggered now. Select a document?';

    if (options.verbose) {
      html = `Query <b>${self.label}</b> is not activated, select another document or check activation rules`;
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
  }
}

module.exports = InactivatedQuery;
