import expect from 'expect.js';
import kibiRemoveHashedParams from '../kibi_remove_hashed_params';

describe('kibi_remove_hashed_params', function () {

  describe('sessionStorage empty', function () {

    const sessionStorage = [];
    sessionStorage.getItem = () => undefined;

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
      const expected = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });
  });

  describe('sessionStorage NOT empty - all hashed parameters not available', function () {

    const sessionStorage = ['boo'];
    sessionStorage.getItem = () => {
      return {sirenSession: {}};
    };

    it('only hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&_k=h@9ef0d63&_a=h@f0ec7a3';
      const expected = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&_k=h@9ef0d63&_a=h@f0ec7a3';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('only NOT hashed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const expected = 'http://host:5606/app/kibana#/dashboard?not_hashed=value';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });

    it('mixed params', function () {
      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&not_hashed=value';
      const expected = 'http://host:5606/app/kibana#/dashboard?_g=h@064add2&not_hashed=value';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });
  });

  describe('sessionStorage NOT empty - some hashed parameter available', function () {
    const sessionStorage = ['boo'];
    sessionStorage.getItem = (key) => {
      if (key === 'h@123456') {
        return {sirenSession: {}};
      }
      return null;
    };

    it('should remove only params which are not present in session storage', function () {

      const original = 'http://host:5606/app/kibana#/dashboard?_g=h@123456&_k=h@9ef0d63&_a=h@f0ec7a3';
      const expected = 'http://host:5606/app/kibana#/dashboard?_g=h@123456';
      const actual = kibiRemoveHashedParams(original, sessionStorage);
      expect(actual).to.equal(expected);
    });
  });

});
