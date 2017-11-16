import joinFields from '../join_fields';
import expect from 'expect.js';

describe('Settings', function () {
  describe('Indices', function () {
    describe('join fields', function () {
      it('should be a function', function () {
        expect(joinFields).to.be.a(Function);
      });

      it('should return index bbb with join on field2 regardless of the order', function () {
        const relations1 = [
          {
            domain: {
              id: 'aaa',
              field: 'field1'
            },
            range: {
              id: 'bbb',
              field: 'field2'
            }
          }
        ];
        const relations2 = [
          {
            domain: {
              id: 'bbb',
              field: 'field2'
            },
            range: {
              id: 'aaa',
              field: 'field1'
            }
          }
        ];
        const indexId = 'aaa';
        const fieldName = 'field1';
        const expected = [
          {
            indexPatternId: 'bbb',
            path: 'field2'
          }
        ];

        expect(joinFields(relations1, indexId, fieldName)).to.eql(expected);
        expect(joinFields(relations2, indexId, fieldName)).to.eql(expected);
      });

      it('should return index aaa with join on field2', function () {
        const relations = [
          {
            domain: {
              id: 'aaa',
              field: 'field1'
            },
            range: {
              id: 'aaa',
              field: 'field2'
            }
          }
        ];
        const indexId = 'aaa';
        const fieldName = 'field1';
        const expected = [
          {
            indexPatternId: 'aaa',
            path: 'field2'
          }
        ];

        expect(joinFields(relations, indexId, fieldName)).to.eql(expected);
      });

      it('should not return undefined for elements that are not connected', function () {
        const relations = [
          {
            domain: {
              id: 'aaa',
              field: 'field1'
            },
            range: {
              id: 'bbb',
              field: 'field2'
            }
          },
          {
            domain: {
              id: 'bbb',
              field: 'field1'
            },
            range: {
              id: 'ccc',
              field: 'field2'
            }
          }
        ];
        const indexId = 'aaa';
        const fieldName = 'field1';
        const expected = [
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
