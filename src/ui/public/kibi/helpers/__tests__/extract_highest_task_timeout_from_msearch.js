import { findPath, extractHighestTaskTimeoutFromMsearch } from 'ui/kibi/helpers/extract_highest_task_timeout_from_msearch';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';


describe('Kibi Components', function () {
  describe('extractHighestTaskTimeoutFromMsearch', function () {

    it('find path', function () {
      const o = {
        a: [
          {
            b: {
              task_timeout: 123
            }
          }
        ]
      };
      const path = findPath(o, 'task_timeout', '');
      expect(path).to.equal('a.0.b.task_timeout');
    });

    it('find path should return null on non objects', function () {
      let path = findPath(null, 'task_timeout', '');
      expect(path).to.equal(null);

      path = findPath('string', 'task_timeout', '');
      expect(path).to.equal(null);
    });

    it('delete the path', function () {

      const meta1 = {};
      const o1 = {
        a: [
          {
            b: {
              task_timeout: 123
            }
          }
        ]
      };
      const meta2 = {};
      const o2 = {
        c: [
          {
            d: {
              task_timeout: 321
            }
          }
        ]
      };

      const msearch =
        JSON.stringify(meta1) + '\n' +
        JSON.stringify(o1) + '\n' +
        JSON.stringify(meta2) + '\n' +
        JSON.stringify(o2) + '\n';
      const res = extractHighestTaskTimeoutFromMsearch(msearch);

      const expected1 = {
        a: [
          {
            b: {}
          }
        ]
      };
      const expected2 = {
        c: [
          {
            d: {}
          }
        ]
      };
      const expectedMsearch =
        JSON.stringify(meta1) + '\n' +
        JSON.stringify(expected1) + '\n' +
        JSON.stringify(meta2) + '\n' +
        JSON.stringify(expected2) + '\n';

      expect(res.taskTimeout).to.equal(321);
      expect(res.body).to.equal(expectedMsearch);
    });
  });
});
