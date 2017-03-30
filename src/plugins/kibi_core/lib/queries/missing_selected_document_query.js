import Promise from 'bluebird';

class MissingSelectedDocument {
  constructor(id) {
    this.id = id;
  }

  fetchResults(options, onlyIds) {
    return Promise.resolve({
      queryId: this.id,
      ids: [],
      queryActivated: false,
      data: {
        config: {
          id: this.id
        }
      }
    });
  };

  getHtml(queryDef, options) {
    let classes = 'results-not-ok-less-verbose';
    let html = `The query ${this.id} needs a document to be selected`;

    if (options.verbose) {
      classes = 'results-not-ok-verbose';
      html = `<i class="fa fa-warning"></i>${html}`;
    }
    return Promise.resolve({
      queryId: this.id,
      queryActivated: true,
      html,
      classes,
      data: {
        config: {
          id: this.id
        }
      }
    });
  };
}

module.exports = MissingSelectedDocument;
