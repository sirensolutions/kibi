var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');
var joinExplanationHelper;
var joinSequenceFilters;
var fieldFormat;

describe('Kibi Components', function () {
  describe('Join Explanation Helper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardId', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.module('kibana/index_patterns', function ($provide) {
        $provide.service('indexPatterns', function (Private, Promise) {
          var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
          return {
            get: function (id) {
              return Promise.resolve(indexPattern);
            }
          };
        });
      });

      ngMock.inject(function (Private) {
        joinExplanationHelper = Private(require('ui/filter_bar/join_explanation'));
        fieldFormat = Private(require('ui/registry/field_formats'));
      });

      joinSequenceFilters = [
        {
          join_sequence: [
            {
              relation: [
                {
                  indices: ['article'],
                  path: 'id',
                  queries: [
                    {
                      query: {
                        bool: {
                          must_not: [],
                          filter: {
                            bool: {
                              must: []
                            }
                          }
                        }
                      }
                    }
                  ]
                },
                {
                  indices: ['company'],
                  path: 'articleid'
                }
              ]
            }
          ]
        }
      ];
    });

    it('prints a nice label for query_string', function (done) {
      var filter = {
        query: {
          query_string: {
            query: 'aaa'
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> query: <b>aaa</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase_prefix object', function (done) {
      var filter = {
        query: {
          match_phrase_prefix: {
            fieldA: {
              query: 'aaa bbb'
            }
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase_prefix string', function (done) {
      var filter = {
        query: {
          match_phrase_prefix: {
            fieldA: 'aaa bbb'
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase object', function (done) {
      var filter = {
        query: {
          match_phrase: {
            fieldA: {
              query: 'aaa bbb'
            }
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase string', function (done) {
      var filter = {
        query: {
          match_phrase: {
            fieldA: 'aaa bbb'
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match object', function (done) {
      var filter = {
        query: {
          match: {
            fieldA: {
              query: 'aaa bbb'
            }
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match string', function (done) {
      var filter = {
        query: {
          match: {
            fieldA: 'aaa bbb'
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> match on fieldA: <b>aaa bbb</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for range', function (done) {
      var filter1 = {
        range: {
          age: {
            gte: 10,
            lte: 20
          }
        }
      };
      var filter2 = {
        range: {
          time: {
            gte: 657147471184,
            lte: 1210414920534
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter1);
      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter2);

      var format = fieldFormat.getDefaultInstance('date');
      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> age: <b>10</b> to <b>20</b> </li>' +
      '<li> time: <b>' + format.convert(657147471184, 'html') + '</b> to <b>' + format.convert(1210414920534, 'html') + '</b> </li>' +
      '</ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for missing filter', function (done) {
      var filter = {
        missing: {
          field: 'joe'
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> missing: <b>joe</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for exists filter', function (done) {
      var filter = {
        exists: {
          field: 'joe'
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> exists: <b>joe</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for negated filters', function (done) {
      var filter = {
        not: {
          exists: {
            field: 'joe'
          }
        }
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br><table class="relation"><tr><td>from: <b>article.id</b></br><ul>' +
      '<li> NOT exists: <b>joe</b> </li></ul></td><td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for unknown filter', function (done) {
      var filter = {
        boo: 'boo',
        baa: 'baa',
        $$hashKey: '42'
      };

      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence"><tr><td><b>Relation:</b></br>' +
      '<table class="relation"><tr><td>from: <b>article.id</b></br><ul><li>' +
      ' <font color="red">Unable to pretty print the filter:</font> ' +
      JSON.stringify(_.omit(filter, '$$hashKey'), null, ' ') + ' </li></ul></td>' +
      '<td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';

      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for geo bounding box filter', function (done) {
      var filter = {
        geo_bounding_box: {
          joe: {
            top_left: {
              lat: 40.73,
              lon: -74.1
            },
            bottom_right: {
              lat: 40.01,
              lon: -71.12
            }
          }
        }
      };
      joinSequenceFilters[0].join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must.push(filter);

      var expected =
      '<table class="sequence">' +
      '<tr>' +
      '<td><b>Relation:</b></br>' +
      '<table class="relation">' +
      '<tr><td>from: <b>article.id</b></br>' +
      '<ul><li>' +
      ' joe: <b>{"lat":40.73,"lon":-74.1}</b> to <b>{"lat":40.01,"lon":-71.12}</b> ' +
      '</li></ul></td>' +
      '<td>to: <b>company.articleid</b></td></tr></table></td></tr></table>';


      joinExplanationHelper.getFilterExplanations(joinSequenceFilters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for join_set', function (done) {
      var relations = [
        [
          {
            indices: [ 'article' ],
            types: [ 'article' ],
            path: 'id'
          },
          {
            indices: [ 'time-testing-3' ],
            types: [ 'time-testing-3' ],
            path: 'articleId'
          }
        ]
      ];

      var filters = [{
        join_set: {
          focus: focus,
          relations: relations,
          queries: {
            'time-testing-3': [
              {
                range: {
                  'fake_field': {
                    'gte': 1125576000000,  // these timestamps match the times in fakeSavedDashboards time-testing-3 dashboard
                    'lte': 1441454400000
                  }
                }
              }
            ]
          }
        }
      }];

      var expected =
      '<ul>' +
        '<li>Index: <b>time-testing-3</b></br>' +
          '<ul>' +
            '<li> fake_field: <b>1125576000000</b> to <b>1441454400000</b> </li>' +
          '</ul>' +
        '</li>' +
      '</ul>';

      joinExplanationHelper.getFilterExplanations(filters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

  });
});
