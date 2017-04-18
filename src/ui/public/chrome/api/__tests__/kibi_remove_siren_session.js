import expect from 'expect.js';
import kibiRemoveSirenSession from '../kibi_remove_siren_session';
import sinon from 'auto-release-sinon';

describe('kibi_remove_siren_session', function () {

  const sessionStorage = {
    removeItem: function () {}
  };

  it('should remove sirenSession when clearSirenSession=true', function () {
    const removeItemSpy = sinon.spy(sessionStorage, 'removeItem');
    const original = 'http://host:5606/app/kibana#/?clearSirenSession=true';
    const expected = 'http://host:5606/app/kibana#/';
    const actual = kibiRemoveSirenSession(original, sessionStorage);
    expect(actual).to.equal(expected);
    sinon.assert.calledWith(removeItemSpy, 'sirenSession');
  });

});
