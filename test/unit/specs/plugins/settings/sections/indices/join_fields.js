define(function (require) {
  var joinFields = require('plugins/settings/sections/indices/join_fields');

  describe('Settings', function () {
    describe('Indices', function () {
      describe('join fields', function () {
        it('should be a function', function () {
          expect(joinFields).to.be.a(Function);
        });

        it('should return index bbb with join on field2 regardless of the order', function () {
          var relations1 = [
            {
              indices: [
                {
                  indexPatternId: 'aaa',
                  path: 'field1'
                },
                {
                  indexPatternId: 'bbb',
                  path: 'field2'
                }
              ]
            }
          ];
          var relations2 = [
            {
              indices: [
                {
                  indexPatternId: 'bbb',
                  path: 'field2'
                },
                {
                  indexPatternId: 'aaa',
                  path: 'field1'
                }
              ]
            }
          ];
          var indexId = 'aaa';
          var fieldName = 'field1';
          var expected = [
            {
              indexPatternId: 'bbb',
              path: 'field2'
            }
          ];

          expect(joinFields(relations1, indexId, fieldName)).to.eql(expected);
          expect(joinFields(relations2, indexId, fieldName)).to.eql(expected);
        });

        it('should return index aaa with join on field2', function () {
          var relations = [
            {
              indices: [
                {
                  indexPatternId: 'aaa',
                  path: 'field1'
                },
                {
                  indexPatternId: 'aaa',
                  path: 'field2'
                }
              ]
            }
          ];
          var indexId = 'aaa';
          var fieldName = 'field1';
          var expected = [
            {
              indexPatternId: 'aaa',
              path: 'field2'
            }
          ];

          expect(joinFields(relations, indexId, fieldName)).to.eql(expected);
        });

        it('should not return undefined for elements that are not connected', function () {
          var relations = [
            {
              indices: [
                {
                  indexPatternId: 'aaa',
                  path: 'field1'
                },
                {
                  indexPatternId: 'bbb',
                  path: 'field2'
                }
              ]
            },
            {
              indices: [
                {
                  indexPatternId: 'bbb',
                  path: 'field1'
                },
                {
                  indexPatternId: 'ccc',
                  path: 'field2'
                }
              ]
            }
          ];
          var indexId = 'aaa';
          var fieldName = 'field1';
          var expected = [
            {
              indexPatternId: 'bbb',
              path: 'field2'
            }
          ];

          expect(joinFields(relations, indexId, fieldName)).to.eql(expected);
        });
      });
    });
  });
});
