import FieldFormatProvider from 'ui/registry/field_formats';
import IndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import noDigestPromises from 'test_utils/no_digest_promises';
/*eslint no-use-before-define: 1*/
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';

let joinSequenceFilters;
let fieldFormat;
let joinExplanation;

describe('Kibi Components', function () {
  describe('Join Explanation Helper', function () {

    noDigestPromises.activateForSuite();

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
      });

      ngMock.module('kibana/index_patterns', function ($provide) {
        $provide.service('indexPatterns', function (Private, Promise) {
          const indexPattern = Private(IndexPatternProvider);
          return {
            get: function (id) {
              return Promise.resolve(indexPattern);
            }
          };
        });
      });

      ngMock.inject(function (Private, _joinExplanation_) {
        fieldFormat = Private(FieldFormatProvider);
        joinExplanation = _joinExplanation_;
      });

      joinSequenceFilters = {
        join_sequence: [
          {
            relation: [
              {
                pattern: 'article',
                indices: ['article'],
                path: 'id'
              },
              {
                pattern: 'company',
                indices: ['company'],
                path: 'articleid'
              }
            ]
          }
        ]
      };
    });

    const addFilter = function (joinSequence, ...filters) {
      joinSequence.relation[0].queries = [
        {
          query: {
            bool: {
              must_not: [],
              filter: {
                bool: {
                  must: filters
                }
              }
            }
          }
        }
      ];
    };

    const expectedJoinSequenceHTML = function (relations) {
      const SPACING = 'fjskfkkkfa';

      const queriesToHtml = function (queries) {
        if (!queries) {
          return '';
        }
        let list = '<ul>';
        _.each(queries, query => {
          list += `<li> ${query} </li>`;
        });
        return (list + '</ul>').replace(/ /g, SPACING);
      };

      const relationToHtml = function ({ from, to }) {
        const fromQueriesHtml = queriesToHtml(from.queries);
        const toQueriesHtml = queriesToHtml(to.queries);
        return `
        <tr>
          <td>
            <b>Relation:</b></br>
              <table class="relation">
              <tr>
                <td>from: <b>${JSON.stringify(from.index, null, ' ')}.${from.path}</b>
                  ${fromQueriesHtml ? '</br>' + fromQueriesHtml : '' }
                </td>
                <td>to: <b>${JSON.stringify(to.index, null, ' ')}.${to.path}</b>
                  ${toQueriesHtml ? '</br>' + toQueriesHtml : '' }
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      };

      const joinSequenceToHtml = function (relations) {
        const groupToHtml = function (relations) {
          let html = `
          <tr>
            <td>
              <b>Group of relations:</b></br>
                <table class="group">`;
          _.each(relations, relation => {
            html += `
                  <tr>
                    <td>${joinSequenceToHtml(relation)}</td>
                  </tr>`;
          });
          html += `
              </table>
            </td>
          </tr>`;
          return html;
        };

        let html = '<table class="sequence">';
        _.each(relations, relation => {
          html += relation.group ? groupToHtml(relation.group) : relationToHtml(relation);
        });
        html += '</table>';
        return html.replace(/>[\n <]*</g, '><');
      };
      return joinSequenceToHtml(relations).replace(new RegExp(SPACING, 'g'), ' ').trim();
    };

    it('prints a nice label for a grouped join_sequence', function (done) {
      const joinSequenceGroup = {
        join_sequence: [
          {
            group: [
              [
                {
                  relation: [
                    { pattern: 'weather-*', indices: [ 'weather-2015-03', 'weather-2015-02' ], path: 'forecast' },
                    { pattern: 'forecast', indices: [ 'forecast' ], path: 'forecast' }
                  ]
                }
              ],
              [
                {
                  relation: [
                    { pattern: 'weather-*', indices: [ 'weather-2015-03', 'weather-2015-02', 'weather-2015-01' ], path: 'forecast' },
                    { pattern: 'forecast', indices: [ 'forecast' ], path: 'forecast' }
                  ]
                }
              ]
            ]
          },
          {
            relation: [
              { pattern: 'forecast', indices: [ 'forecast' ], path: 'forecast' },
              { pattern: 'weather-*', indices: [ 'weather-2015-03', 'weather-2015-02' ], path: 'forecast' }
            ]
          }
        ]
      };

      const filter1 = {
        query_string: {
          query: 'aaa'
        }
      };
      const filter2 = {
        query_string: {
          query: 'bbb'
        }
      };

      addFilter(joinSequenceGroup.join_sequence[0].group[0][0], filter1);
      addFilter(joinSequenceGroup.join_sequence[0].group[1][0], filter2);

      const expected = expectedJoinSequenceHTML([
        {
          from: { index: [ 'forecast' ], path: 'forecast' },
          to: { index: [ 'weather-2015-03', 'weather-2015-02' ], path: 'forecast' }
        },
        {
          group: [
            [
              {
                from: {
                  index: [ 'weather-2015-03', 'weather-2015-02' ],
                  path: 'forecast',
                  queries: [ 'query: <b>aaa</b>' ]
                },
                to: { index: [ 'forecast' ], path: 'forecast' }
              }
            ],
            [
              {
                from: {
                  index: [ 'weather-2015-03', 'weather-2015-02', 'weather-2015-01' ],
                  path: 'forecast',
                  queries: [ 'query: <b>bbb</b>' ]
                },
                to: { index: [ 'forecast' ], path: 'forecast' }
              }
            ]
          ]
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceGroup ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.be(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for terms', function () {
      const filter = {
        terms: {
          fielda: [
            'one',
            'two'
          ]
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'any on fielda: <b>one, two</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      return joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
      });
    });

    it('prints a nice label for query_string', function (done) {
      const filter = {
        query_string: {
          query: 'aaa'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'query: <b>aaa</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase_prefix object', function (done) {
      const filter = {
        match_phrase_prefix: {
          fieldA: {
            query: 'aaa bbb'
          }
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase_prefix string', function (done) {
      const filter = {
        match_phrase_prefix: {
          fieldA: 'aaa bbb'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase object', function (done) {
      const filter = {
        match_phrase: {
          fieldA: {
            query: 'aaa bbb'
          }
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match_phrase string', function (done) {
      const filter = {
        match_phrase: {
          fieldA: 'aaa bbb'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match object', function (done) {
      const filter = {
        match: {
          fieldA: {
            query: 'aaa bbb'
          }
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for match string', function (done) {
      const filter = {
        match: {
          fieldA: 'aaa bbb'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'match on fieldA: <b>aaa bbb</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for range', function (done) {
      const filter1 = {
        range: {
          age: {
            gte: 10,
            lt: 20
          }
        }
      };
      const filter2 = {
        range: {
          time: {
            gt: 657147471184,
            lte: 1210414920534
          }
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter1, filter2);

      const format = fieldFormat.getDefaultInstance('date');
      const queries = [
        'age: <b>10</b> (inclusive) to <b>20</b> (exclusive)',
        `time: <b>${format.convert(657147471184, 'html')}</b> (exclusive) to <b>${format.convert(1210414920534, 'html')}</b> (inclusive)`
      ];
      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for missing filter', function (done) {
      const filter = {
        missing: {
          field: 'joe'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'missing: <b>joe</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for exists filter', function (done) {
      const filter = {
        exists: {
          field: 'joe'
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'exists: <b>joe</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for negated filters', function (done) {
      const filter = {
        not: {
          exists: {
            field: 'joe'
          }
        }
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'NOT exists: <b>joe</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for unknown filter', function (done) {
      const filter = {
        boo: 'boo',
        baa: 'baa',
        $$hashKey: '42'
      };

      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              '<font color="red">Unable to pretty print the filter:</font> ' +
                JSON.stringify(_.omit(filter, '$$hashKey'), null, ' ')
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for geo bounding box filter', function (done) {
      const filter = {
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
      addFilter(joinSequenceFilters.join_sequence[0], filter);

      const expected = expectedJoinSequenceHTML([
        {
          from: {
            index: [ 'article' ],
            path: 'id',
            queries: [
              'joe: <b>{"lat":40.73,"lon":-74.1}</b> to <b>{"lat":40.01,"lon":-71.12}</b>'
            ]
          },
          to: {
            index: [ 'company' ],
            path: 'articleid'
          }
        }
      ]);

      joinExplanation.getFilterExplanations([ joinSequenceFilters ]).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('prints a nice label for join_set', function (done) {
      const relations = [
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

      const filters = [
        {
          join_set: {
            focus: focus,
            relations: relations,
            queries: {
              'time-testing-3': {
                Time: [
                  {
                    range: {
                      fake_field: {
                        gt: 1125576000000, // these timestamps match the times in fakeSavedDashboards time-testing-3 dashboard
                        lte: 1441454400000
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      ];

      const expected =
      '<ul class="explanation join-set">' +
        '<li>From <b>Time</b>:</br>' +
          '<ul>' +
            '<li> fake_field: <b>1125576000000</b> (exclusive) to <b>1441454400000</b> (inclusive) </li>' +
          '</ul>' +
        '</li>' +
      '</ul>';

      joinExplanation.getFilterExplanations(filters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal(expected);
        done();
      }).catch(done);
    });

    it('does not print anything if there are no filters or queries', function (done) {
      const relations = [
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

      const filters = [
        {
          join_set: {
            focus: focus,
            relations: relations
          }
        }
      ];

      joinExplanation.getFilterExplanations(filters).then(function (expl) {
        expect(expl.length).to.equal(1);
        expect(expl[0]).to.equal('');
        done();
      }).catch(done);
    });

  });
});
