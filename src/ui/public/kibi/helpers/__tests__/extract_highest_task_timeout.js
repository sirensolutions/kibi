import { findPath, extractHighestTaskTimeout } from 'ui/kibi/helpers/extract_highest_task_timeout';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';


describe('Kibi Components', function () {
  describe('extractHighestTaskTimeout', function () {


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


    it('delete the path', function () {

      const o1 = {
        a: [
          {
            b: {
              task_timeout: 123
            }
          }
        ]
      };
      const o2 = {
        c: [
          {
            d: {
              task_timeout: 321
            }
          }
        ]
      };

      const msearch = JSON.stringify(o1) + '\n' + JSON.stringify(o2) + '\n';
      const res = extractHighestTaskTimeout(msearch);

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
      const expectedMsearch = JSON.stringify(expected1) + '\n' + JSON.stringify(expected2) + '\n';


      expect(res.taskTimeout).to.equal(321);
      expect(res.body).to.equal(expectedMsearch);


    });
  });
});
