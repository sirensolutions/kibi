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
  return async function () {
    try {
      await wrapped();
    } catch (error) {
      expect().fail(error);
    }
  };

};
