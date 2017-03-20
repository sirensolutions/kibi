import expect from 'expect.js';
import kibiRemoveHashedParams from '../kibi_remove_hashed_params';

describe('kibi_remove_hashed_params', function () {

  describe('sessionStorage empty', function () {

    const sessionStorage = [];

    it('only hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&_k=h@9ef0d63&_a=h@f0ec7a3';
      const expected = 'http://host:5606/app/kibana#/dashboard';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('mixed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&not_hashed=value';
      const expected = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('only NOT hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const expected = false; // as it did not change anything
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });
  });

  describe('sessionStorage NOT empty', function () {

    const sessionStorage = ['boo'];

    it('only hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&_k=h@9ef0d63&_a=h@f0ec7a3';
      const expected = false;
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('only NOT hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const expected = false;
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('mixed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&not_hashed=value';
      const expected = false;
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

  });

});
