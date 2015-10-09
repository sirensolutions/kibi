define(function (require) {
  var _ = require('lodash');
  var joinExplanationHelper;
  var $rootScope;
  var filters;
  var fieldFormat;

  describe('Kibi Components', function () {
    describe('Join Explanation Helper', function () {

      beforeEach(function () {
        module('kibana');

        module('kibana/index_patterns', function ($provide) {
          $provide.service('indexPatterns', function (Private, Promise) {
            var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
            return {
              get: function (id) {
                return Promise.resolve(indexPattern);
              }
            };
          });
        });

        inject(function ($injector, Private, _$rootScope_) {
          $rootScope = _$rootScope_;
          joinExplanationHelper = Private(require('components/filter_bar/join_explanation'));
          fieldFormat = Private(require('registry/field_formats'));
        });

        filters = [
          {
            joe: 'eoj'
          },
          {
            join: {
              indexes: [
                {
                  id: 'logstash-*',
                  type: 'logs'
                }
              ]
            }
          }
        ];
      });

      it('should set the correct set of indexes', function (done) {
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.indexes['logstash-*']).to.be.ok();
          done();
        });
        $rootScope.$apply();
      });

      it('should return an empty string if indexes is undefined', function () {
        expect(joinExplanationHelper.createLabel(null, null)).to.be('');
      });

      it('prints a nice label for query_string', function (done) {
        var filter = {
          query: {
            query_string: {
              query: 'aaa'
            }
          }
        };
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' query: <b>' + filter.query.query_string.query + '</b> ');
          done();
        });
        $rootScope.$apply();
      });

      it('prints a nice label for match', function (done) {
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
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' match on fieldA: <b>aaa bbb</b> ');

          filter.query[field] = string;
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' match on fieldA: <b>aaa bbb</b> ');
        };

        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          assert('match');
          assert('match_phrase');
          assert('match_phrase_prefix');
          done();
        });
        $rootScope.$apply();
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
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          var format = fieldFormat.getDefaultInstance('date');

          expect(joinExplanationHelper.createLabel(filter1, 'logstash-*'))
            .to.be(' age: <b>10</b> to <b>20</b> ');
          expect(joinExplanationHelper.createLabel(filter2, 'logstash-*'))
            .to.be(' time: <b>' + format.convert(657147471184, 'html') + '</b> to <b>' +
              format.convert(1210414920534, 'html') + '</b> ');
          done();
        });
        $rootScope.$apply();
      });

      it('prints a nice label for missing filter', function (done) {
        var filter = {
          missing: {
            field: 'joe'
          }
        };
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' missing: <b>joe</b> ');
          done();
        });
        $rootScope.$apply();
      });

      it('prints a nice label for exists filter', function (done) {
        var filter = {
          exists: {
            field: 'joe'
          }
        };
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' exists: <b>joe</b> ');
          done();
        });
        $rootScope.$apply();
      });

      it('prints a nice label for negated filters', function (done) {
        var filter = {
          not: {
            exists: {
              field: 'joe'
            }
          }
        };
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' NOT exists: <b>joe</b> ');
          done();
        });
        $rootScope.$apply();
      });

      it('prints a nice label for unknown filter', function (done) {
        var filter = {
          boo: 'boo',
          baa: 'baa',
          $$hashKey: '42'
        };
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' <font color="red">Unable to pretty print the filter:</font> ' +
                JSON.stringify(_.omit(filter, '$$hashKey'), null, ' ') + ' ');
          done();
        });
        $rootScope.$apply();
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
        joinExplanationHelper.setIndexesFromJoinFilter(filters).then(function () {
          expect(joinExplanationHelper.createLabel(filter, 'logstash-*'))
            .to.be(' joe: <b>' + JSON.stringify(filter.geo_bounding_box.joe.top_left, null, '') + '</b> to ' +
                '<b>' + JSON.stringify(filter.geo_bounding_box.joe.bottom_right, null, '') + '</b> ');
          done();
        });
        $rootScope.$apply();
      });
    });
  });
});
