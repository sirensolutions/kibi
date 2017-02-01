import expect from 'expect.js';

/**
 * Wraps a mocha test executing ES7 async code.
 *
 * Usage:
 *
 * ```
 * it("should test an async function", wrapAsync(async function {
 *   let result = await asyncFunction();
 *   // expect ...
 * }));
 * ```
 */
export default function (wrapped) {
  return async function (callback) {
    try {
      await wrapped();
      if (callback) {
        callback();
      }
    } catch (error) {
      if (!callback) {
        expect().fail(error);
      } else {
        callback(error);
      }
    }
  };
};
