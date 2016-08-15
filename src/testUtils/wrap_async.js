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
      callback();
    } catch (error) {
      callback(error);
    }
  };
};
