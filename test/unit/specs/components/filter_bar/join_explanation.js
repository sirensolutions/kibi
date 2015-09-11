define(function (require) {
  var _ = require('lodash');
  var joinExplanationHelper;
  var indexes;

  describe('Kibi Components', function () {
    describe('Join Explanation Helper', function () {

      beforeEach(function () {
        module('kibana');

        inject(function ($injector, Private) {
          joinExplanationHelper = Private(require('components/filter_bar/join_explanation'));
          indexes = {
            article: {
              fields: Private(require('fixtures/logstash_fields'))
            }
          };
        });
      });

      it('should return an empty string if indexes is undefined', function () {
        expect(joinExplanationHelper.createLabel(null, null, null)).to.be('');
      });

      it('prints a nice label for query_string', function () {
        var filter = {
          query: {
            query_string: {
              query: 'aaa'
            }
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' query: <b>' + filter.query.query_string.query + '</b> ');
      });

      it('prints a nice label for match', function () {
        var assert = function (field) {
          var filter = { query: {} };
          var object = {
            fieldA: {
              query: 'aaa bbb'
            }
          };
          var string = {
            fieldA: 'aaa bbb'
          };

          filter.query[field] = object;
          expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
            .to.be(' match on fieldA: <b>aaa bbb</b> ');

          filter.query[field] = string;
          expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
            .to.be(' match on fieldA: <b>aaa bbb</b> ');
        };

        assert('match');
        assert('match_phrase');
        assert('match_phrase_prefix');
      });

      it('prints a nice label for range', function () {
        var filter = {
          range: {
            age: {
              gte: 10,
              lte: 20
            }
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' age: <b>10</b> to <b>20</b> ');

        filter = {
          range: {
            time: {
              gte: 657147471184,
              lte: 1210414920534
            }
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' time: <b>October 28th 1990, 20:57:51.184</b> to <b>May 10th 2008, 11:22:00.534</b> ');
      });

      it('prints a nice label for missing filter', function () {
        var filter = {
          missing: {
            field: 'joe'
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' missing: <b>joe</b> ');
      });

      it('prints a nice label for exists filter', function () {
        var filter = {
          exists: {
            field: 'joe'
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' exists: <b>joe</b> ');
      });

      it('prints a nice label for negated filters', function () {
        var filter = {
          not: {
            exists: {
              field: 'joe'
            }
          }
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' NOT exists: <b>joe</b> ');
      });

      it('prints a nice label for unknown filter', function () {
        var filter = {
          boo: 'boo',
          baa: 'baa',
          $$hashKey: '42'
        };
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' <font color="red">Unable to pretty print the filter:</font> ' +
          JSON.stringify(_.omit(filter, '$$hashKey'), null, ' ') + ' ');
      });

      it('prints a nice label for geo bounding box filter', function () {
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
        expect(joinExplanationHelper.createLabel(filter, 'article', indexes))
        .to.be(' joe: <b>' + JSON.stringify(filter.geo_bounding_box.joe.top_left, null, '') + '</b> to ' +
          '<b>' + JSON.stringify(filter.geo_bounding_box.joe.bottom_right, null, '') + '</b> ');
      });
    });
  });
});
