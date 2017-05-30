export default class BaseError extends Error {
  constructor(message, inner) {
    super(message);
    this.inner = inner;

    for (const attr in this.inner) {
      if (typeof this.inner[attr] === 'function') {
        this[attr] = () => this.inner[attr].apply(this.inner, arguments);
      } else {
        this[attr] = this.inner[attr];
      }
    }
  }
}
